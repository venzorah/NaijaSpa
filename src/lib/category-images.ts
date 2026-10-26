import { PHOTOS, publicWellnessPhoto } from "./photos";

/** Tasteful wellness photography keyed by category slug. */
export const CATEGORY_IMAGES: Record<string, string> = {
  massage: PHOTOS.massage,
  spa: PHOTOS.spa,
  facials: PHOTOS.facials,
  body: PHOTOS.body,
  couples: PHOTOS.couples,
  packages: PHOTOS.packages,
  beauty: PHOTOS.beauty,
  nuru: PHOTOS.nuru
};

export function categoryImage(slug: string, imageUrl?: string | null) {
  const fallback = CATEGORY_IMAGES[normalizeCategorySlug(slug)] || CATEGORY_IMAGES[slug] || "/brand/icon-green.png";
  if (imageUrl) return publicWellnessPhoto(imageUrl, fallback);
  return fallback;
}

export function normalizeCategorySlug(slug: string) {
  let value = slug.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  return value.replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function categoryHref(slug: string) {
  const value = normalizeCategorySlug(slug);
  return value ? `/category/${encodeURIComponent(value)}` : "/explore";
}

export function matchCategory<T extends { slug: string }>(rows: T[], slug: string): T | undefined {
  const want = normalizeCategorySlug(slug);
  return rows.find((row) => normalizeCategorySlug(row.slug) === want);
}
