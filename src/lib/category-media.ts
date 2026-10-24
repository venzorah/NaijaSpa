import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectImageMime, extensionForMime } from "./galleries";

export const CATEGORY_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function categoryUploadsRoot() {
  return path.resolve(process.cwd(), "uploads", "categories");
}

export function categoryMediaUrl(fileName: string) {
  return `/api/media/categories/${encodeURIComponent(fileName)}`;
}

export async function saveCategoryImageFile(id: string, bytes: Uint8Array) {
  if (bytes.byteLength > CATEGORY_MAX_IMAGE_BYTES) {
    throw Object.assign(new Error("Each category image must be at most 2 MB"), { status: 400 });
  }
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw Object.assign(new Error("Upload a JPEG, PNG, WebP, or GIF image"), { status: 400 });
  }
  const fileName = `${id}.${extensionForMime(mime)}`;
  const dir = categoryUploadsRoot();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);
  return { url: categoryMediaUrl(fileName), mime };
}

export async function deleteCategoryImageFile(url: string | null | undefined) {
  const prefix = "/api/media/categories/";
  if (!url?.startsWith(prefix)) return;
  const rest = decodeURIComponent(url.slice(prefix.length));
  const root = categoryUploadsRoot();
  const resolved = path.resolve(root, rest);
  if (!resolved.startsWith(root + path.sep)) return;
  try {
    await unlink(resolved);
  } catch {
    /* missing file is fine */
  }
}

export function resolveCategoryMediaPath(file: string) {
  const root = categoryUploadsRoot();
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}
