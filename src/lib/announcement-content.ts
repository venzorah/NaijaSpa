import { publicContentUrl } from "./public-content";

export const MAX_ANNOUNCEMENT_IMAGES = 6;
export const MAX_ANNOUNCEMENT_LINKS = 8;

export type AnnouncementImage = { src: string; href?: string };
export type AnnouncementLink = { label: string; href: string };

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

export function isAnnouncementImageSrc(value: string) {
  const url = value.trim();
  if (!publicContentUrl.safeParse(url).success) return false;
  let path = url.split("?")[0];
  if (/^https:\/\//i.test(url)) {
    try {
      path = new URL(url).pathname;
    } catch {
      return false;
    }
  }
  return /\.(png|jpe?g|gif|webp)$/i.test(path);
}

export function normalizeAnnouncementImages(raw: unknown): AnnouncementImage[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) fail("Images must be a list.");
  if (raw.length > MAX_ANNOUNCEMENT_IMAGES) fail(`Attach at most ${MAX_ANNOUNCEMENT_IMAGES} images.`);
  const out: AnnouncementImage[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const src =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && "src" in item
          ? String((item as { src?: unknown }).src ?? "").trim()
          : "";
    if (!src) continue;
    if (!isAnnouncementImageSrc(src)) fail("Images must be a library upload or an https image URL (JPEG, PNG, WebP or GIF).");
    const hrefRaw =
      item && typeof item === "object" && "href" in item ? String((item as { href?: unknown }).href ?? "").trim() : "";
    if (hrefRaw && !publicContentUrl.safeParse(hrefRaw).success) {
      fail("Image links must be a site path starting with / or an https:// URL.");
    }
    if (seen.has(src)) continue;
    seen.add(src);
    out.push({ src, href: hrefRaw || undefined });
  }
  return out;
}

export function normalizeAnnouncementLinks(raw: unknown): AnnouncementLink[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) fail("Links must be a list.");
  if (raw.length > MAX_ANNOUNCEMENT_LINKS) fail(`Attach at most ${MAX_ANNOUNCEMENT_LINKS} extra links.`);
  const out: AnnouncementLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") fail("Each extra link needs a label and a URL.");
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const href = String((item as { href?: unknown }).href ?? "").trim();
    if (!label && !href) continue;
    if (!label || !href) fail("Add both a link label and a URL, or leave both blank.");
    if (label.length > 40) fail("Link labels can be at most 40 characters.");
    if (!publicContentUrl.safeParse(href).success) fail("Use a site path starting with / or an https:// URL.");
    out.push({ label, href });
  }
  return out;
}
