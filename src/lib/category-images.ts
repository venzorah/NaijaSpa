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
  const fallback = CATEGORY_IMAGES[slug] || "/brand/icon-green.png";
  if (imageUrl) return publicWellnessPhoto(imageUrl, fallback);
  return fallback;
}
