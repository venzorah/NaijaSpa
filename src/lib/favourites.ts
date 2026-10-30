import { z } from "zod";
import { prisma } from "./db";

export const FavouriteTargetSchema = z.object({
  vendorId: z.string().trim().min(1).max(128).optional(),
  serviceId: z.string().trim().min(1).max(128).optional()
}).strict().refine((value) => Boolean(value.vendorId || value.serviceId), "Choose a service or provider to save");

export async function saveFavourite(userId: string, input: unknown) {
  const target = FavouriteTargetSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    // Serialize saves for this account; nullable targets cannot use the original
    // three-column unique key to make repeated saves idempotent.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    if (target.serviceId) {
      const service = await tx.service.findUnique({ where: { id: target.serviceId }, select: { vendorId: true } });
      if (!service) throw Object.assign(new Error("Service not found"), { status: 404 });
      if (target.vendorId && service.vendorId !== target.vendorId) throw Object.assign(new Error("This service does not belong to that provider"), { status: 400 });
    } else if (!await tx.vendor.findUnique({ where: { id: target.vendorId! }, select: { id: true } })) {
      throw Object.assign(new Error("Provider not found"), { status: 404 });
    }
    const where = target.serviceId ? { userId, serviceId: target.serviceId } : { userId, vendorId: target.vendorId!, serviceId: null };
    const existing = await tx.favourite.findFirst({ where });
    if (existing) {
      // A card can supply a provider after an earlier service-only save.
      if (target.serviceId && target.vendorId && existing.vendorId !== target.vendorId) return tx.favourite.update({ where: { id: existing.id }, data: { vendorId: target.vendorId } });
      return existing;
    }
    return tx.favourite.create({ data: { userId, vendorId: target.vendorId, serviceId: target.serviceId } });
  }, { isolationLevel: "ReadCommitted" });
}
