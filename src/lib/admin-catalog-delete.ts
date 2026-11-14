import { prisma } from "./db";
import { deleteCategoryImageFile } from "./category-media";
import { removeUnusedServiceImage } from "./service-images";

export async function deleteCatalogEntry(actorId: string, id: string, type: "category" | "service", reason: string) {
  const files: string[] = [];
  const result = await prisma.$transaction(async (tx) => {
    if (type === "category") {
      const item = await tx.category.findUnique({ where: { id }, select: { id: true, deletedAt: true, imageUrl: true, slug: true } });
      if (!item || item.deletedAt) throw Object.assign(new Error("Category not found"), { status: 404 });
      if (item.imageUrl) files.push(item.imageUrl);
      const services = await tx.service.findMany({ where: { categoryId: id }, select: { id: true, imageUrl: true, deletedAt: true } });
      let kept = 0;
      for (const service of services) {
        if (service.imageUrl) files.push(service.imageUrl);
        const bookings = await tx.booking.count({ where: { serviceId: service.id } });
        if (bookings === 0) {
          await tx.serviceSlugAlias.deleteMany({ where: { serviceId: service.id } });
          await tx.favourite.deleteMany({ where: { serviceId: service.id } });
          await tx.campaign.deleteMany({ where: { serviceId: service.id } });
          await tx.service.delete({ where: { id: service.id } });
        } else {
          kept++;
          await tx.serviceSlugAlias.deleteMany({ where: { serviceId: service.id } });
          await tx.service.update({
            where: { id: service.id },
            data: { active: false, deletedAt: new Date(), imageUrl: null, slug: `deleted-svc-${service.id}` }
          });
        }
      }
      if (kept === 0) {
        await tx.category.delete({ where: { id } });
      } else {
        await tx.category.update({
          where: { id },
          data: { active: false, deletedAt: new Date(), imageUrl: null, imagePayload: null, slug: `deleted-cat-${id}` }
        });
      }
    } else {
      const item = await tx.service.findUnique({ where: { id }, select: { id: true, deletedAt: true, imageUrl: true } });
      if (!item || item.deletedAt) throw Object.assign(new Error("Service not found"), { status: 404 });
      if (item.imageUrl) files.push(item.imageUrl);
      const bookings = await tx.booking.count({ where: { serviceId: id } });
      await tx.serviceSlugAlias.deleteMany({ where: { serviceId: id } });
      if (bookings === 0) {
        await tx.favourite.deleteMany({ where: { serviceId: id } });
        await tx.campaign.deleteMany({ where: { serviceId: id } });
        await tx.service.delete({ where: { id } });
      } else {
        await tx.service.update({
          where: { id },
          data: { active: false, deletedAt: new Date(), imageUrl: null, slug: `deleted-svc-${id}` }
        });
      }
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: `${type}.delete`,
        entityType: type === "category" ? "Category" : "Service",
        entityId: id,
        afterJson: JSON.stringify({ deleted: true, reason })
      }
    });
    return { ok: true };
  });
  for (const url of files) {
    await removeUnusedServiceImage(url).catch(() => undefined);
    await deleteCategoryImageFile(url).catch(() => undefined);
  }
  return result;
}
