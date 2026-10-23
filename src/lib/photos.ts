/** Local wellness photos of Black guests and therapists. */
export const PHOTOS = {
  hero1: "/photos/hero-1.jpg",
  hero2: "/photos/hero-2.jpg",
  hero3: "/photos/hero-3.jpg",
  massage: "/photos/massage.jpg",
  spa: "/photos/spa.jpg",
  facials: "/photos/facials.jpg",
  body: "/photos/body.jpg",
  couples: "/photos/couples.jpg",
  packages: "/photos/packages.jpg",
  beauty: "/photos/beauty.jpg",
  nuru: "/photos/nuru.jpg",
  bandSpa: "/photos/band-spa.jpg",
  bandCouples: "/photos/band-couples.jpg",
  bg: "/photos/bg.jpg"
} as const;

const STOCK_PHOTO_HOST = /unsplash\.com|pexels\.com|picsum\.photos|loremflickr\.com/i;
const BRAND_ICON = /\/brand\/icon-(white|green)\.png$/i;

/** Swap leftover Caucasian stock CDNs for local Nigerian wellness photos. */
export function publicWellnessPhoto(url: string | null | undefined, fallback: string = PHOTOS.massage): string {
  if (!url?.trim()) return fallback;
  const value = url.trim();
  if (STOCK_PHOTO_HOST.test(value)) return fallback;
  return value;
}

/** First local wellness photo, skipping stock CDNs and brand-mark placeholders. */
export function firstWellnessPhoto(...urls: Array<string | null | undefined>): string {
  for (const url of urls) {
    const value = url?.trim();
    if (!value || STOCK_PHOTO_HOST.test(value) || BRAND_ICON.test(value)) continue;
    return value;
  }
  return PHOTOS.massage;
}

export function listingPhotos(input: {
  imageUrl?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
}) {
  return {
    cover: firstWellnessPhoto(input.imageUrl, input.coverUrl, input.logoUrl),
    avatar: firstWellnessPhoto(input.logoUrl, input.imageUrl, input.coverUrl)
  };
}
