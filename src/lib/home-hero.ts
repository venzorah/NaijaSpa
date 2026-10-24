import { PHOTOS, publicWellnessPhoto } from "./photos";

export type HomeHeroBanner = {
  kicker: string;
  title: string;
  subtitle: string;
  priceLine: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

export type HomeHeroAd = {
  id: string;
  vendorId: string | null;
  vendorName?: string | null;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  active?: boolean;
};

export type HomeHeroPayload = {
  banner: HomeHeroBanner;
  ads: HomeHeroAd[];
  displayLimit: number;
};

export const HERO_AD_LIMIT_KEY = "heroAdDisplayLimit";
export const HERO_AD_LIMIT_MIN = 1;
export const HERO_AD_LIMIT_MAX = 8;
export const DEFAULT_HERO_AD_DISPLAY_LIMIT = 2;
export const HERO_AD_INTERVAL_MS = 3000;

export const DEFAULT_HOME_HERO: HomeHeroBanner = {
  kicker: "Signature oil hour",
  title: "Warm oil, a slower glide",
  subtitle: "Verified therapists, private suites, and prices in Naira.",
  priceLine: "Starting from ₦45,000",
  ctaLabel: "Explore massage",
  ctaHref: "/explore?category=massage",
  imageUrl: PHOTOS.hero1
};

export const DEFAULT_HERO_ADS: HomeHeroAd[] = [
  {
    id: "demo-ad-osun",
    vendorId: null,
    vendorName: "Osun Wellness Spa",
    title: "Osun Wellness Spa",
    body: "Lekki’s premium oil suites. ID-checked therapists, hotel or home on request.",
    imageUrl: PHOTOS.bandSpa,
    ctaLabel: "Visit Osun",
    ctaHref: "/providers/osun-wellness",
    sortOrder: 0
  },
  {
    id: "demo-ad-olive",
    vendorId: null,
    vendorName: "The Olive Room",
    title: "The Olive Room",
    body: "Quiet treatment suites in Lekki Phase 1. A slower hour for two.",
    imageUrl: PHOTOS.bg,
    ctaLabel: "Visit Olive",
    ctaHref: "/providers/olive-room-lekki",
    sortOrder: 1
  }
];

export function clampHeroAdDisplayLimit(value: number, fallback = DEFAULT_HERO_AD_DISPLAY_LIMIT) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(HERO_AD_LIMIT_MAX, Math.max(HERO_AD_LIMIT_MIN, Math.trunc(value)));
}

export function parseHeroAdDisplayLimit(map: Record<string, string | undefined>): number {
  return clampHeroAdDisplayLimit(
    Number(map[HERO_AD_LIMIT_KEY] ?? DEFAULT_HERO_AD_DISPLAY_LIMIT),
    DEFAULT_HERO_AD_DISPLAY_LIMIT
  );
}

export function sanitizeHeroBanner(input: Partial<HomeHeroBanner> | null | undefined): HomeHeroBanner {
  const banner = { ...DEFAULT_HOME_HERO, ...input };
  return {
    kicker: (banner.kicker || DEFAULT_HOME_HERO.kicker).trim(),
    title: (banner.title || DEFAULT_HOME_HERO.title).trim(),
    subtitle: (banner.subtitle ?? "").trim(),
    priceLine: (banner.priceLine ?? "").trim(),
    ctaLabel: (banner.ctaLabel || DEFAULT_HOME_HERO.ctaLabel).trim(),
    ctaHref: (banner.ctaHref || DEFAULT_HOME_HERO.ctaHref).trim(),
    imageUrl: publicWellnessPhoto(banner.imageUrl, DEFAULT_HOME_HERO.imageUrl)
  };
}

export function sanitizeHeroAd(ad: HomeHeroAd, index = 0): HomeHeroAd {
  return {
    id: ad.id,
    vendorId: ad.vendorId ?? null,
    vendorName: ad.vendorName ?? null,
    title: ad.title.trim() || "Premium vendor",
    body: (ad.body ?? "").trim(),
    imageUrl: publicWellnessPhoto(ad.imageUrl, index % 2 === 0 ? PHOTOS.bandSpa : PHOTOS.bg),
    ctaLabel: (ad.ctaLabel || "View vendor").trim(),
    ctaHref: (ad.ctaHref || "/explore").trim(),
    sortOrder: Number.isFinite(ad.sortOrder) ? ad.sortOrder : index,
    active: ad.active
  };
}

export function visibleHeroAds(ads: HomeHeroAd[], displayLimit: number): HomeHeroAd[] {
  const limit = clampHeroAdDisplayLimit(displayLimit);
  return ads
    .filter((ad) => ad.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit)
    .map((ad, i) => sanitizeHeroAd(ad, i));
}

export function demoHomeHero(displayLimit = DEFAULT_HERO_AD_DISPLAY_LIMIT): HomeHeroPayload {
  return {
    banner: DEFAULT_HOME_HERO,
    ads: visibleHeroAds(DEFAULT_HERO_ADS, displayLimit),
    displayLimit: clampHeroAdDisplayLimit(displayLimit)
  };
}
