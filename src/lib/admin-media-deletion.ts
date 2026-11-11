import { prisma } from "./db";
import { adminMediaItems } from "./admin-media";
import { deleteMediaObject } from "./object-storage";
import { deleteGalleryImageFile } from "./gallery-media";
import { deleteCategoryImageFile } from "./category-media";

export function ownedMediaKey(url: string) {
  const match = /^\/api\/media\/((?:library|categories)\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|gif|webp)|galleries\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|gif|webp))$/.exec(url);
  return match?.[1] ?? null;
}

export function removeGalleryUrls(raw: string, urls: Set<string>) {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw;
    const next = parsed.filter(item => !urls.has(typeof item === "string" ? item : item?.url));
    return next.length === parsed.length ? raw : JSON.stringify(next);
  } catch { return raw; }
}

export async function cleanupDeletedImages(urls?: string[]) {
  const pending = await prisma.mediaAsset.findMany({ where: { deletedAt: { not: null }, storageCleanupPending: true, ...(urls ? { url: { in: urls } } : {}) }, select: { url: true }, take: 100 });
  let index = 0;
  const deadline = Date.now() + 15000;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
  while (index < pending.length && Date.now() < deadline) {
    const item = pending[index++];
    try {
      const key = ownedMediaKey(item.url);
      if (key?.startsWith("galleries/")) await deleteGalleryImageFile(item.url);
      else if (key?.startsWith("categories/")) await deleteCategoryImageFile(item.url);
      else if (key) await deleteMediaObject(key);
      await prisma.mediaAsset.update({ where: { url: item.url }, data: { storageCleanupPending: false } });
    } catch { /* Keep the pending marker so storage deletion can be retried. */ }
  }
  }));
  return { cleanupPending: await prisma.mediaAsset.count({ where: { deletedAt: { not: null }, storageCleanupPending: true, ...(urls ? { url: { in: urls } } : {}) } }) };
}

export async function deleteAdminImages(actorId: string, requested: string[]) {
  const urls = [...new Set(requested)];
  if (!urls.length || urls.length > 100) throw Object.assign(new Error("Select between 1 and 100 images."), { status: 400 });
  const items = await adminMediaItems();
  const existing = await prisma.mediaAsset.findMany({ where: { url: { in: urls } }, select: { url: true } });
  const known = new Set([...items.map(i => i.url), ...existing.map(i => i.url)]);
  if (urls.some(url => !known.has(url))) throw Object.assign(new Error("An image is no longer in the library. Refresh and try again."), { status: 404 });
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(77107421)`;
    await tx.service.updateMany({ where: { imageUrl: { in: urls } }, data: { imageUrl: null } });
    await tx.category.updateMany({ where: { imageUrl: { in: urls } }, data: { imageUrl: null, imagePayload: null, imageMime: "" } });
    await tx.vendor.updateMany({ where: { coverUrl: { in: urls } }, data: { coverUrl: null } });
    await tx.vendor.updateMany({ where: { logoUrl: { in: urls } }, data: { logoUrl: null } });
    const vendors = await tx.vendor.findMany({ where: { galleryJson: { not: "[]" } }, select: { id: true, galleryJson: true } });
    for (const vendor of vendors) {
      const galleryJson = removeGalleryUrls(vendor.galleryJson, new Set(urls));
      if (galleryJson !== vendor.galleryJson) await tx.vendor.update({ where: { id: vendor.id }, data: { galleryJson } });
    }
    await tx.vendorStaff.updateMany({ where: { photoUrl: { in: urls } }, data: { photoUrl: null } });
    await tx.therapistGalleryImage.deleteMany({ where: { url: { in: urls } } });
    await tx.homeHero.updateMany({ where: { imageUrl: { in: urls } }, data: { imageUrl: "" } });
    await tx.heroAd.updateMany({ where: { imageUrl: { in: urls } }, data: { imageUrl: "", active: false } });
    for (const url of urls) {
      const data = { deletedAt: new Date(), imagePayload: null, storageCleanupPending: Boolean(ownedMediaKey(url)) };
      await tx.mediaAsset.upsert({ where: { url }, update: data, create: { ...data, url, name: items.find(i => i.url === url)?.name || "Deleted image", mime: "", byteSize: 0, createdById: actorId } });
    }
    await tx.auditLog.create({ data: { actorId, action: "media.delete", entityType: "MediaAsset", entityId: urls.length === 1 ? urls[0] : "bulk", afterJson: JSON.stringify({ urls, removedAttachments: true, recordsPreserved: true }) } });
  }, { timeout: 20000 });
  return { ok: true, deleted: urls.length, ...await cleanupDeletedImages(urls) };
}
