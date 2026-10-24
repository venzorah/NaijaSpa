import { unstable_cache } from "next/cache";
import { usingDemoListings } from "./live-db";
import {
  quoteBooking,
  sanitizePublicVendor,
  DEFAULT_COMMERCIAL,
  FREE_ENTITLEMENT,
  locationAddonKobo,
  type LocationType
} from "./commercial";
import {
  demoCategories,
  demoFaqs,
  demoHomeRails,
  demoNearbyVendors,
  demoReviewsForVendor,
  demoServiceById,
  demoServiceBySlug,
  demoTreatmentsForVendor,
  demoVendorBySlug,
  demoCms,
  demoHomeHero
} from "./demo-catalog";
import {
  DEFAULT_HOME_FEED_CONFIG,
  homeServicePoolTake,
  type HomeCard,
  type HomeFeedConfig,
  type HomeRails,
  type NearbyVendor
} from "./home-types";
import { publicVideoLinks } from "./galleries";
import { filterByServiceArea, sortByPlace, type LivePlace } from "./nigeria";
import { type HomeHeroPayload } from "./home-hero";
import { PHOTOS, publicWellnessPhoto } from "./photos";

export { usingDemoListings } from "./live-db";
export type { HomeCard, HomeFeedConfig, HomeRails, NearbyVendor } from "./home-types";
export { DEFAULT_HOME_FEED_CONFIG, parseHomeFeedConfig } from "./home-types";

async function resolveHomeFeedLimits(): Promise<HomeFeedConfig> {
  if (!process.env.DATABASE_URL) return DEFAULT_HOME_FEED_CONFIG;
  try {
    const { getHomeFeedConfig } = await import("./db");
    return await getHomeFeedConfig();
  } catch {
    return DEFAULT_HOME_FEED_CONFIG;
  }
}

async function resolveHomeHero(): Promise<HomeHeroPayload> {
  if (!process.env.DATABASE_URL) return demoHomeHero();
  try {
    const { getHomeHeroPayload } = await import("./db");
    return await getHomeHeroPayload();
  } catch {
    return demoHomeHero();
  }
}

const HOME_PLACEMENTS = ["homepage_featured", "homepage_premium", "homepage_promo"] as const;

function compactService(s: {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  basePriceKobo: number;
  durationMin: number;
}) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    imageUrl: publicWellnessPhoto(s.imageUrl, PHOTOS.massage),
    basePriceKobo: s.basePriceKobo,
    durationMin: s.durationMin
  };
}

function demoHomePayload(limits: HomeFeedConfig, place?: LivePlace | null, hero?: HomeHeroPayload) {
  return {
    demo: true as const,
    categories: demoCategories,
    rails: demoHomeRails(limits, place),
    nearby: sortByPlace(filterByServiceArea(demoNearbyVendors(), place, (v) => v), place, (v) => v).slice(0, limits.nearby),
    faqs: demoFaqs,
    hero: hero ?? demoHomeHero()
  };
}

function placeCacheKey(place?: LivePlace | null) {
  return `${place?.state ?? ""}|${place?.city ?? ""}|${place?.neighbourhood ?? ""}`;
}

export async function getHomeCatalog(place?: LivePlace | null) {
  return unstable_cache(() => loadHomeCatalog(place ?? null), ["home-catalog", placeCacheKey(place)], {
    revalidate: 30,
    tags: ["home-catalog"]
  })();
}

async function loadHomeCatalog(place: LivePlace | null) {
  const [limits, hero] = await Promise.all([resolveHomeFeedLimits(), resolveHomeHero()]);
  if (usingDemoListings()) return demoHomePayload(limits, place, hero);
  try {
  const { prisma } = await import("./db");
  const { vendorEntitlements } = await import("./entitlements");
  const now = new Date();
  const [categories, services, faqs, campaigns] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, imageUrl: true }
    }),
    prisma.service.findMany({
      where: { active: true, vendor: { visibility: "public", applicationStatus: "approved" } },
      select: {
        id: true,
        vendorId: true,
        slug: true,
        name: true,
        imageUrl: true,
        basePriceKobo: true,
        durationMin: true,
        spaEnabled: true,
        hotelEnabled: true,
        homeEnabled: true,
        vendor: {
          select: {
            slug: true,
            businessName: true,
            state: true,
            city: true,
            neighbourhood: true,
            ratingAvg: true,
            reviewCount: true,
            verificationStatus: true,
            logoUrl: true,
            coverUrl: true,
            privatePhone: true,
            privateWhatsapp: true
          }
        },
        category: { select: { name: true } }
      },
      take: homeServicePoolTake(limits)
    }),
    prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 4, select: { question: true, answer: true } }),
    prisma.campaign.findMany({
      where: {
        active: true,
        placement: { in: [...HOME_PLACEMENTS] },
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      select: { vendorId: true, serviceId: true, placement: true },
      orderBy: { priority: "desc" }
    })
  ]);

  const entitlements = await vendorEntitlements([...services.map((s) => s.vendorId), ...campaigns.map((c) => c.vendorId)]);

  const cardFromService = (s: (typeof services)[number], badge?: string, sponsored?: boolean): HomeCard => {
    const ent = entitlements.get(s.vendorId) ?? FREE_ENTITLEMENT;
    const vendor = sanitizePublicVendor(s.vendor, ent);
    const tags = [s.category?.name, s.spaEnabled && "Spa", s.hotelEnabled && "Hotel", s.homeEnabled && "Home"].filter(
      Boolean
    ) as string[];
    return {
      service: compactService(s),
      vendor: {
        slug: vendor.slug,
        businessName: vendor.businessName,
        state: vendor.state,
        city: vendor.city,
        neighbourhood: vendor.neighbourhood,
        ratingAvg: vendor.ratingAvg,
        reviewCount: vendor.reviewCount,
        verificationStatus: vendor.verificationStatus,
        logoUrl: vendor.logoUrl
      },
      tags: tags.slice(0, 4),
      nextLabel: "Next: Book a time",
      badge,
      sponsored
    };
  };

  const byId = new Map(services.map((s) => [s.id, s]));
  const pickFromCampaigns = (placement: string, badge: string) => {
    const cards: HomeCard[] = [];
    const seen = new Set<string>();
    for (const c of campaigns.filter((x) => x.placement === placement)) {
      const s = (c.serviceId && byId.get(c.serviceId)) || services.find((row) => row.vendorId === c.vendorId);
      if (!s || seen.has(s.id)) continue;
      seen.add(s.id);
      cards.push(cardFromService(s, badge, true));
    }
    return cards;
  };

  const featured = pickFromCampaigns("homepage_featured", "Featured");
  const premiumFromAds = pickFromCampaigns("homepage_premium", "Premium");
  const promo = pickFromCampaigns("homepage_promo", "Promo");

  const fill = (target: HomeCard[], source: HomeCard[], badge: string, limit: number) => {
    const out = target.slice(0, limit);
    const seen = new Set(out.map((c) => c.service.id));
    for (const c of source) {
      if (out.length >= limit) break;
      if (seen.has(c.service.id)) continue;
      seen.add(c.service.id);
      out.push({ ...c, badge });
    }
    return out;
  };

  const allCards = sortByPlace(
    filterByServiceArea(
      services.map((s) => {
        const ent = entitlements.get(s.vendorId) ?? FREE_ENTITLEMENT;
        const sponsored = campaigns.some((c) => c.vendorId === s.vendorId);
        return cardFromService(s, ent.activePaid ? "Premium" : sponsored ? "Featured" : undefined, sponsored);
      }),
      place,
      (c) => c.vendor
    ),
    place,
    (c) => c.vendor
  );
  const premiumPool = sortByPlace(
    filterByServiceArea(
      services.filter((s) => entitlements.get(s.vendorId)?.enhancedVisibility).map((s) => cardFromService(s, "Premium")),
      place,
      (c) => c.vendor
    ),
    place,
    (c) => c.vendor
  );
  const promoPool = sortByPlace(
    filterByServiceArea(
      [...services].sort((a, b) => a.basePriceKobo - b.basePriceKobo).map((s) => cardFromService(s, "Promo")),
      place,
      (c) => c.vendor
    ),
    place,
    (c) => c.vendor
  );

  const rails: HomeRails = {
    featured: sortByPlace(
      fill(filterByServiceArea(featured, place, (c) => c.vendor), allCards, "Featured", limits.featured),
      place,
      (c) => c.vendor
    ),
    premium: sortByPlace(
      fill(filterByServiceArea(premiumFromAds, place, (c) => c.vendor), premiumPool.length ? premiumPool : allCards, "Premium", limits.premium),
      place,
      (c) => c.vendor
    ),
    promo: sortByPlace(fill(filterByServiceArea(promo, place, (c) => c.vendor), promoPool, "Promo", limits.promo), place, (c) => c.vendor)
  };

  const nearbyMap = new Map<string, NearbyVendor>();
  for (const s of services) {
    if (nearbyMap.has(s.vendor.slug)) continue;
    nearbyMap.set(s.vendor.slug, {
      slug: s.vendor.slug,
      businessName: s.vendor.businessName,
      state: s.vendor.state,
      city: s.vendor.city,
      neighbourhood: s.vendor.neighbourhood,
      coverUrl: publicWellnessPhoto(s.vendor.coverUrl, PHOTOS.bandSpa),
      ratingAvg: s.vendor.ratingAvg
    });
  }

  return {
    demo: false,
    categories,
    rails,
    nearby: sortByPlace(filterByServiceArea([...nearbyMap.values()], place, (v) => v), place, (v) => v).slice(0, limits.nearby),
    faqs,
    hero
  };
  } catch {
    return demoHomePayload(limits, place, hero);
  }
}

function initialsName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Guest";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function locationQuotes(
  service: {
    basePriceKobo: number;
    spaEnabled: boolean;
    hotelEnabled: boolean;
    homeEnabled: boolean;
    hotelAddonKobo?: number | null;
    homeAddonKobo?: number | null;
  },
  entitlement: Parameters<typeof quoteBooking>[0]["entitlement"],
  config: Parameters<typeof quoteBooking>[0]["config"]
) {
  return (["spa", "hotel", "home"] as const)
    .filter((l) => (l === "spa" ? service.spaEnabled : l === "hotel" ? service.hotelEnabled : service.homeEnabled))
    .map((l) => ({
      l,
      q: quoteBooking({
        basePriceKobo: service.basePriceKobo,
        location: l,
        locationAddonKobo: locationAddonKobo(l, service),
        entitlement,
        config
      })
    }));
}

function mapPublicGalleries(
  galleries: Array<{
    id: string;
    title: string;
    caption: string;
    images: Array<{ id: string; url: string; caption: string; therapistName: string }>;
  }>
) {
  return galleries.map((g) => ({
    id: g.id,
    title: g.title,
    caption: g.caption,
    images: g.images.map((img) => ({
      id: img.id,
      url: publicWellnessPhoto(img.url, PHOTOS.spa),
      caption: img.caption,
      therapistName: img.therapistName
    }))
  }));
}

function demoPublicService(slug: string) {
  const service = demoServiceBySlug(slug);
  if (!service) return null;
  const vendor = sanitizePublicVendor(service.vendor, service.vendor.entitlement);
  return {
    demo: true as const,
    service,
    vendor,
    quotes: locationQuotes(service, service.vendor.entitlement, DEFAULT_COMMERCIAL),
    treatments: demoTreatmentsForVendor(service.vendorId),
    reviews: demoReviewsForVendor(service.vendorId),
    galleries: mapPublicGalleries(service.vendor.galleries ?? []),
    tags: [
      service.categoryName,
      service.spaEnabled && "Spa/Office",
      service.hotelEnabled && "Hotel",
      service.homeEnabled && "Home"
    ].filter(Boolean) as string[]
  };
}

export async function getPublicService(slug: string) {
  if (usingDemoListings()) return demoPublicService(slug);
  try {
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const service = await prisma.service.findUnique({
    where: { slug },
    include: {
      vendor: {
        include: {
          galleries: {
            include: { images: { orderBy: { sortOrder: "asc" } } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      category: true,
      addons: true,
      staff: { include: { staff: true } }
    }
  });
  if (!service || !service.active) return null;
  const ent = await vendorEntitlement(service.vendorId);
  const vendor = sanitizePublicVendor(
    { ...service.vendor, coverUrl: publicWellnessPhoto(service.vendor.coverUrl, PHOTOS.bandSpa) },
    ent
  );
  const cfg = await getCommercialConfig();
  const [treatments, reviewRows] = await Promise.all([
    prisma.service.findMany({
      where: { vendorId: service.vendorId, active: true },
      select: { id: true, slug: true, name: true, durationMin: true, basePriceKobo: true },
      orderBy: { durationMin: "asc" }
    }),
    prisma.review.findMany({
      where: { vendorId: service.vendorId, status: "published" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);
  return {
    demo: false,
    service: { ...service, imageUrl: publicWellnessPhoto(service.imageUrl, PHOTOS.massage) },
    vendor,
    galleries: mapPublicGalleries(service.vendor.galleries),
    quotes: locationQuotes(service, ent, cfg),
    treatments,
    reviews: reviewRows.map((r) => ({
      vendorId: r.vendorId,
      author: initialsName(r.user.name),
      rating: r.rating,
      createdAt: r.createdAt.toISOString(),
      body: r.body
    })),
    tags: [
      service.category?.name,
      service.spaEnabled && "Spa/Office",
      service.hotelEnabled && "Hotel",
      service.homeEnabled && "Home"
    ].filter(Boolean) as string[]
  };
  } catch {
    return demoPublicService(slug);
  }
}

export async function getPublicVendor(slug: string) {
  if (usingDemoListings()) return demoVendorBySlug(slug);
  try {
  const { prisma } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true }, include: { category: true } },
      galleries: { include: { images: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      videoLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });
  if (!vendor || vendor.visibility !== "public") return null;
  const ent = await vendorEntitlement(vendor.id);
  return {
    vendor: sanitizePublicVendor(
      { ...vendor, coverUrl: publicWellnessPhoto(vendor.coverUrl, PHOTOS.bandSpa) },
      ent
    ),
    description: vendor.description,
    services: vendor.services.map((s) => ({
      ...s,
      imageUrl: publicWellnessPhoto(s.imageUrl, PHOTOS.massage)
    })),
    galleries: mapPublicGalleries(vendor.galleries),
    videoLinks: publicVideoLinks(
      vendor.videoLinks.map((v) => ({ id: v.id, url: v.url, title: v.title })),
      ent
    )
  };
  } catch {
    return demoVendorBySlug(slug);
  }
}

export async function quotePublicService(serviceId: string, location: LocationType) {
  if (usingDemoListings()) {
    const service = demoServiceById(serviceId);
    if (!service) throw Object.assign(new Error("Service not found"), { status: 404 });
    return quoteBooking({
      basePriceKobo: service.basePriceKobo,
      location,
      locationAddonKobo: locationAddonKobo(location, service),
      entitlement: service.vendor.entitlement,
      config: DEFAULT_COMMERCIAL
    });
  }
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  const ent = await vendorEntitlement(service.vendorId);
  const config = await getCommercialConfig();
  return quoteBooking({
    basePriceKobo: service.basePriceKobo,
    location,
    locationAddonKobo: locationAddonKobo(location, service),
    entitlement: ent,
    config
  });
}

export function getDemoCms(slug: string) {
  return demoCms[slug] ?? null;
}
