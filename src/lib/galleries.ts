import type { Entitlement } from "./commercial";

export const MAX_VENDOR_GALLERIES = 7;
export const MAX_VIDEO_LINKS = 20;
export const PROFILE_GALLERY_TITLE = "Profile photos";
export const PROFILE_GALLERY_MAX_IMAGES = 6;

export interface GalleryConfig {
  maxImagesPerGallery: number;
  maxImageBytes: number;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  maxImagesPerGallery: 10,
  maxImageBytes: 2 * 1024 * 1024
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export function videoLinksAllowed(entitlement: Entitlement): boolean {
  return entitlement.activePaid;
}

export function parseGalleryConfig(map: Record<string, string | undefined>): GalleryConfig {
  const images = Number(map.galleryMaxImagesPerGallery ?? DEFAULT_GALLERY_CONFIG.maxImagesPerGallery);
  const bytes = Number(map.galleryMaxImageBytes ?? DEFAULT_GALLERY_CONFIG.maxImageBytes);
  return {
    maxImagesPerGallery: clampInt(images, 1, 30, DEFAULT_GALLERY_CONFIG.maxImagesPerGallery),
    maxImageBytes: clampInt(bytes, 50_000, 10 * 1024 * 1024, DEFAULT_GALLERY_CONFIG.maxImageBytes)
  };
}

export function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function assertGalleryTitle(title: string) {
  const t = title.trim();
  if (t.length < 2 || t.length > 80) {
    throw Object.assign(new Error("Gallery name must be 2–80 characters"), { status: 400 });
  }
  return t;
}

export function isProfileGalleryTitle(title: string) {
  return title.trim().toLowerCase() === PROFILE_GALLERY_TITLE.toLowerCase();
}

export function profileGalleryImageLimit(config: GalleryConfig) {
  return Math.min(PROFILE_GALLERY_MAX_IMAGES, config.maxImagesPerGallery);
}

export function assertCanCreateGallery(existingCount: number) {
  if (existingCount >= MAX_VENDOR_GALLERIES) {
    throw Object.assign(new Error(`You can create at most ${MAX_VENDOR_GALLERIES} therapist galleries`), {
      status: 400
    });
  }
}

export function assertCanAddImage(
  existingCount: number,
  config: GalleryConfig,
  byteSize: number,
  options?: { profile?: boolean }
) {
  const maxImages = options?.profile ? profileGalleryImageLimit(config) : config.maxImagesPerGallery;
  if (existingCount >= maxImages) {
    throw Object.assign(new Error(`This gallery may contain at most ${maxImages} images`), {
      status: 400
    });
  }
  if (byteSize > config.maxImageBytes) {
    throw Object.assign(
      new Error(`Each image must be at most ${Math.round(config.maxImageBytes / 1024)} KB`),
      { status: 400 }
    );
  }
}

export function detectImageMime(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

const VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com", "player.vimeo.com"];

export function normalizeHttpsUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw Object.assign(new Error("Enter a valid https URL"), { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    throw Object.assign(new Error("Only https URLs are allowed"), { status: 400 });
  }
  return parsed;
}

export function assertVideoUrl(raw: string) {
  const parsed = normalizeHttpsUrl(raw);
  const host = parsed.hostname.toLowerCase();
  const allowedHost = VIDEO_HOSTS.includes(host) || parsed.pathname.match(/\.(mp4|webm|mov)$/i);
  if (!allowedHost && !host.includes(".")) {
    throw Object.assign(new Error("Use a YouTube, Vimeo, or direct https video link"), { status: 400 });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("Video URL must not include credentials"), { status: 400 });
  }
  return parsed.toString();
}

export function assertImageUrl(raw: string) {
  const value = raw.trim();
  if (value.startsWith("/photos/") || value.startsWith("/api/media/")) {
    if (value.includes("..")) throw Object.assign(new Error("Invalid image path"), { status: 400 });
    return value;
  }
  const parsed = normalizeHttpsUrl(value);
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("Image URL must not include credentials"), { status: 400 });
  }
  return parsed.toString();
}

export function assertVideoLinksAllowed(entitlement: Entitlement) {
  if (!videoLinksAllowed(entitlement)) {
    throw Object.assign(new Error("Video links are available on paid plans only"), { status: 403 });
  }
}

export function publicVideoLinks<T>(links: T[], entitlement: Entitlement): T[] {
  return videoLinksAllowed(entitlement) ? links : [];
}

export function profileImagesFromGalleries<T extends { title: string; images: unknown[] }>(galleries: T[]): T["images"] {
  const profile = galleries.find((g) => isProfileGalleryTitle(g.title));
  if (profile?.images.length) return profile.images.slice(0, PROFILE_GALLERY_MAX_IMAGES);
  return galleries.flatMap((g) => g.images).slice(0, PROFILE_GALLERY_MAX_IMAGES);
}

export function extraNamedGalleries<T extends { title: string; images: unknown[] }>(galleries: T[]): T[] {
  const hasProfile = galleries.some((g) => isProfileGalleryTitle(g.title) && g.images.length);
  if (!hasProfile) return [];
  return galleries.filter((g) => !isProfileGalleryTitle(g.title) && g.images.length);
}
