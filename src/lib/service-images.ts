import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { detectImageMime, extensionForMime } from "@/lib/galleries";
import { deleteGalleryImageFile, mediaUrl, uploadsRoot } from "@/lib/gallery-media";
import { putMediaObject, uploadStorage } from "@/lib/object-storage";

export const SERVICE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export async function saveServiceImage(vendorId: string, file: Blob) {
  if (!file.size || file.size > SERVICE_IMAGE_MAX_BYTES) throw Object.assign(new Error("Choose an image up to 2 MB."), { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) throw Object.assign(new Error("Choose a JPEG, PNG, WebP or GIF image."), { status: 400 });
  const name = `service-${randomUUID()}.${extensionForMime(mime)}`;
  if (uploadStorage() === "r2") await putMediaObject(`galleries/${vendorId}/${name}`, bytes, mime);
  else {
    const folder = path.join(uploadsRoot(), vendorId);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), bytes);
  }
  return mediaUrl(vendorId, name);
}

export async function removeUnusedServiceImage(url: string | null) {
  if (!url || !/^\/api\/media\/galleries\/[\w-]+\/service-[\w-]+\.(png|jpg|jpeg|webp|gif)$/.test(url)) return;
  const [services, galleries, vendors] = await Promise.all([
    prisma.service.count({ where: { imageUrl: url } }),
    prisma.therapistGalleryImage.count({ where: { url } }),
    prisma.vendor.count({ where: { OR: [{ coverUrl: url }, { logoUrl: url }] } })
  ]);
  if (!services && !galleries && !vendors) await deleteGalleryImageFile(url);
}
