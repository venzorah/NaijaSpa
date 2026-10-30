import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectImageMime, extensionForMime } from "./galleries";
import { deleteMediaObject, putMediaObject, uploadStorage } from "./object-storage";

export function uploadsRoot() {
  return path.resolve(process.cwd(), "uploads", "galleries");
}

export function mediaUrl(vendorId: string, fileName: string) {
  return `/api/media/galleries/${encodeURIComponent(vendorId)}/${encodeURIComponent(fileName)}`;
}

export async function saveGalleryImageFile(vendorId: string, id: string, bytes: Uint8Array) {
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw Object.assign(new Error("Upload a JPEG, PNG, WebP, or GIF image"), { status: 400 });
  }
  const fileName = `${id}.${extensionForMime(mime)}`;
  const storage = uploadStorage();
  if (storage === "r2") {
    await putMediaObject(`galleries/${vendorId}/${fileName}`, bytes, mime);
    return { url: mediaUrl(vendorId, fileName), mime, storage };
  }
  const dir = path.join(uploadsRoot(), vendorId);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
  } catch {
    /* Vercel and other hosts are read-only; bytes stay in the database. */
  }
  return { url: mediaUrl(vendorId, fileName), mime, storage };
}

export async function deleteGalleryImageFile(url: string) {
  const prefix = "/api/media/galleries/";
  if (!url.startsWith(prefix)) return;
  const rest = decodeURIComponent(url.slice(prefix.length));
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(rest)) return;
  await deleteMediaObject(`galleries/${rest}`);
  const resolved = path.resolve(uploadsRoot(), rest);
  if (!resolved.startsWith(uploadsRoot() + path.sep)) return;
  try {
    await unlink(resolved);
  } catch {
    /* missing file is fine */
  }
}

export function resolveMediaPath(segments: string[]) {
  const root = uploadsRoot();
  const resolved = path.resolve(root, ...segments);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}
