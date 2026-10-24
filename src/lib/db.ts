import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMMERCIAL, type CommercialConfig } from "./commercial";
import { parseGalleryConfig, type GalleryConfig } from "./galleries";
import {
  DEFAULT_HOME_HERO,
  HERO_AD_LIMIT_KEY,
  parseHeroAdDisplayLimit,
  sanitizeHeroAd,
  sanitizeHeroBanner,
  visibleHeroAds,
  type HomeHeroPayload
} from "./home-hero";
import { HOME_FEED_CONFIG_KEYS, parseHomeFeedConfig, type HomeFeedConfig } from "./home-types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getCommercialConfig(): Promise<CommercialConfig> {
  const rows = await prisma.systemConfig.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    spaSurchargeKobo: Number(map.spaSurchargeKobo ?? DEFAULT_COMMERCIAL.spaSurchargeKobo),
    hotelSurchargeKobo: Number(map.hotelSurchargeKobo ?? DEFAULT_COMMERCIAL.hotelSurchargeKobo),
    homeSurchargeKobo: Number(map.homeSurchargeKobo ?? DEFAULT_COMMERCIAL.homeSurchargeKobo),
    surchargeRecipient: (map.surchargeRecipient as CommercialConfig["surchargeRecipient"]) ?? "vendor",
    freeCommissionBps: Number(map.freeCommissionBps ?? DEFAULT_COMMERCIAL.freeCommissionBps),
    paidCommissionBps: Number(map.paidCommissionBps ?? DEFAULT_COMMERCIAL.paidCommissionBps),
    graceDays: Number(map.graceDays ?? DEFAULT_COMMERCIAL.graceDays)
  };
}

export async function getGalleryConfig(): Promise<GalleryConfig> {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: ["galleryMaxImagesPerGallery", "galleryMaxImageBytes"] } }
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return parseGalleryConfig(map);
}

export async function getHomeFeedConfig(): Promise<HomeFeedConfig> {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: Object.values(HOME_FEED_CONFIG_KEYS) } }
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return parseHomeFeedConfig(map);
}

export async function setConfig(key: string, value: string) {
  await prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getHeroAdDisplayLimit(): Promise<number> {
  const row = await prisma.systemConfig.findUnique({ where: { key: HERO_AD_LIMIT_KEY } });
  return parseHeroAdDisplayLimit({ [HERO_AD_LIMIT_KEY]: row?.value });
}

export async function getHomeHeroPayload(): Promise<HomeHeroPayload> {
  const [hero, ads, displayLimit] = await Promise.all([
    prisma.homeHero.findUnique({ where: { id: "home" } }),
    prisma.heroAd.findMany({
      include: { vendor: { select: { businessName: true, slug: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    getHeroAdDisplayLimit()
  ]);
  const publicAds = ads.map((ad, i) =>
    sanitizeHeroAd(
      {
        id: ad.id,
        vendorId: ad.vendorId,
        vendorName: ad.vendor?.businessName ?? null,
        title: ad.title,
        body: ad.body,
        imageUrl: ad.imageUrl,
        ctaLabel: ad.ctaLabel,
        ctaHref: ad.ctaHref || (ad.vendor ? `/providers/${ad.vendor.slug}` : "/explore"),
        sortOrder: ad.sortOrder,
        active: ad.active
      },
      i
    )
  );
  return {
    banner: sanitizeHeroBanner(hero ?? DEFAULT_HOME_HERO),
    ads: visibleHeroAds(publicAds, displayLimit),
    displayLimit
  };
}
