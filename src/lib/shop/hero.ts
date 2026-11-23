import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";
import { shopPublicPath } from "@/lib/shop-host";
import { prisma } from "@/lib/db";
import { SHOP_CONFIG } from "./constants";
import { markShopDbUnavailable, shopDbUnavailable } from "./ensure";

export type ShopHeroSlide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  imageUrl: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type ShopHeroSlideView = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  image: string;
  primary: { href: string; label: string; external: boolean };
  secondary: { href: string; label: string; external: boolean };
};

export const DEFAULT_SHOP_HERO: ShopHeroSlide[] = [
  {
    id: "products",
    kicker: "NaijaSpa Shop",
    title: "Oils, soaps and tools from verified sellers.",
    body: "A specialised beauty and wellness store — not a general marketplace. Book treatments on NaijaSpa; buy products here.",
    imageUrl: PHOTOS.bandSpa,
    primaryLabel: "Shop products",
    primaryHref: "/search",
    secondaryLabel: "Book a treatment",
    secondaryHref: "https://naijaspa.com"
  },
  {
    id: "oils",
    kicker: "Home ritual",
    title: "Botanical oils and body care for after the spa.",
    body: "Stock the same class of oils, butters and soaps your therapist would use — from approved Nigerian sellers.",
    imageUrl: PHOTOS.beauty,
    primaryLabel: "Browse products",
    primaryHref: "/search",
    secondaryLabel: "Sell on Shop",
    secondaryHref: "/sell"
  },
  {
    id: "tools",
    kicker: "For sellers",
    title: "List tools, kits and aftercare on NaijaSpa Shop.",
    body: "Product Store is separate from service listing plans. Customers pay once; you dispatch your own orders.",
    imageUrl: PHOTOS.spa,
    primaryLabel: "Sell on Shop",
    primaryHref: "/sell",
    secondaryLabel: "See the catalog",
    secondaryHref: "/search"
  }
];

function clip(value: unknown, fallback: string, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

export function sanitizeShopHeroSlide(input: Partial<ShopHeroSlide> | null | undefined, index: number): ShopHeroSlide {
  const fallback = DEFAULT_SHOP_HERO[index] ?? DEFAULT_SHOP_HERO[0];
  return {
    id: fallback.id,
    kicker: clip(input?.kicker, fallback.kicker, 80),
    title: clip(input?.title, fallback.title, 120),
    body: clip(input?.body, fallback.body, 280),
    imageUrl: publicWellnessPhoto(input?.imageUrl, fallback.imageUrl),
    primaryLabel: clip(input?.primaryLabel, fallback.primaryLabel, 40),
    primaryHref: clip(input?.primaryHref, fallback.primaryHref, 500),
    secondaryLabel: clip(input?.secondaryLabel, fallback.secondaryLabel, 40),
    secondaryHref: clip(input?.secondaryHref, fallback.secondaryHref, 500)
  };
}

export function parseShopHero(raw: string | null | undefined): ShopHeroSlide[] {
  let parsed: unknown[] = [];
  if (raw?.trim()) {
    try {
      const value = JSON.parse(raw) as unknown;
      if (Array.isArray(value)) parsed = value;
    } catch {
      parsed = [];
    }
  }
  return DEFAULT_SHOP_HERO.map((slide, index) =>
    sanitizeShopHeroSlide((parsed[index] ?? slide) as Partial<ShopHeroSlide>, index)
  );
}

export function isExternalShopHref(href: string) {
  return /^https?:\/\//i.test(href.trim());
}

export function publicShopCtaHref(href: string, shopHost: boolean) {
  const value = href.trim() || "/search";
  if (isExternalShopHref(value)) return value;
  const path = value.startsWith("/shop") ? value : `/shop${value.startsWith("/") ? value : `/${value}`}`;
  return shopPublicPath(path, shopHost);
}

export function presentShopHero(slides: ShopHeroSlide[], shopHost: boolean): ShopHeroSlideView[] {
  return slides.map((slide) => ({
    id: slide.id,
    kicker: slide.kicker,
    title: slide.title,
    body: slide.body,
    image: slide.imageUrl,
    primary: {
      href: publicShopCtaHref(slide.primaryHref, shopHost),
      label: slide.primaryLabel,
      external: isExternalShopHref(slide.primaryHref)
    },
    secondary: {
      href: publicShopCtaHref(slide.secondaryHref, shopHost),
      label: slide.secondaryLabel,
      external: isExternalShopHref(slide.secondaryHref)
    }
  }));
}

export async function getShopHeroSlides(): Promise<ShopHeroSlide[]> {
  if (shopDbUnavailable()) return parseShopHero(null);
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.hero } });
    return parseShopHero(row?.value);
  } catch {
    markShopDbUnavailable();
    return parseShopHero(null);
  }
}
