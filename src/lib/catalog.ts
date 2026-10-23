import { usingDemoListings } from "./live-db";
import {
  quoteBooking,
  sanitizePublicVendor,
  DEFAULT_COMMERCIAL,
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
  demoCms
} from "./demo-catalog";
import type { HomeCard, HomeRails, NearbyVendor } from "./home-types";

export { usingDemoListings } from "./live-db";
export type { HomeCard, HomeRails, NearbyVendor } from "./home-types";

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
    imageUrl: s.imageUrl,
    basePriceKobo: s.basePriceKobo,
    durationMin: s.durationMin
  };
}

export async function getHomeCatalog() {
  if (usingDemoListings()) {
    return {
      demo: true,
      categories: demoCategories,
      rails: demoHomeRails(),
      nearby: demoNearbyVendors(),
      faqs: demoFaqs
    };
  }
  const { prisma } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const now = new Date();
  const [categories, services, faqs, campaigns] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      where: { active: true, vendor: { visibility: "public", applicationStatus: "approved" } },
      include: { vendor: true, category: true },
      take: 36
    }),
    prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    prisma.campaign.findMany({
      where: {
        active: true,
        placement: { in: [...HOME_PLACEMENTS] },
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      include: { vendor: true, service: true },
      orderBy: { priority: "desc" }
    })
  ]);

  const entitlements = new Map<string, Awaited<ReturnType<typeof vendorEntitlement>>>();
  for (const s of services) {
    if (!entitlements.has(s.vendorId)) entitlements.set(s.vendorId, await vendorEntitlement(s.vendorId));
  }
  for (const c of campaigns) {
    if (!entitlements.has(c.vendorId)) entitlements.set(c.vendorId, await vendorEntitlement(c.vendorId));
  }

  const cardFromService = (s: (typeof services)[number], badge?: string, sponsored?: boolean): HomeCard => {
    const ent = entitlements.get(s.vendorId)!;
    const vendor = sanitizePublicVendor(s.vendor, ent);
    const tags = [s.category?.name, s.spaEnabled && "Spa", s.hotelEnabled && "Hotel", s.homeEnabled && "Home"].filter(
      Boolean
    ) as string[];
    return {
      service: compactService(s),
      vendor: {
        slug: vendor.slug,
        businessName: vendor.businessName,
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

  const fill = (target: HomeCard[], source: HomeCard[], badge: string, limit = 8) => {
    const seen = new Set(target.map((c) => c.service.id));
    for (const c of source) {
      if (target.length >= limit) break;
      if (seen.has(c.service.id)) continue;
      seen.add(c.service.id);
      target.push({ ...c, badge });
    }
    return target;
  };

  const allCards = services.map((s) => {
    const ent = entitlements.get(s.vendorId)!;
    const sponsored = campaigns.some((c) => c.vendorId === s.vendorId);
    return cardFromService(s, ent.activePaid ? "Premium" : sponsored ? "Featured" : undefined, sponsored);
  });
  const premiumPool = services
    .filter((s) => entitlements.get(s.vendorId)?.enhancedVisibility)
    .map((s) => cardFromService(s, "Premium"));
  const promoPool = [...services].sort((a, b) => a.basePriceKobo - b.basePriceKobo).map((s) => cardFromService(s, "Promo"));

  const rails: HomeRails = {
    featured: fill(featured, allCards, "Featured"),
    premium: fill(premiumFromAds, premiumPool.length ? premiumPool : allCards, "Premium"),
    promo: fill(promo, promoPool, "Promo")
  };

  const nearbyMap = new Map<string, NearbyVendor>();
  for (const s of services) {
    if (nearbyMap.has(s.vendor.slug)) continue;
    nearbyMap.set(s.vendor.slug, {
      slug: s.vendor.slug,
      businessName: s.vendor.businessName,
      city: s.vendor.city,
      neighbourhood: s.vendor.neighbourhood,
      coverUrl: s.vendor.coverUrl,
      ratingAvg: s.vendor.ratingAvg
    });
  }

  return { demo: false, categories, rails, nearby: [...nearbyMap.values()].slice(0, 8), faqs };
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

export async function getPublicService(slug: string) {
  if (usingDemoListings()) {
    const service = demoServiceBySlug(slug);
    if (!service) return null;
    const vendor = sanitizePublicVendor(service.vendor, service.vendor.entitlement);
    return {
      demo: true,
      service,
      vendor,
      quotes: locationQuotes(service, service.vendor.entitlement, DEFAULT_COMMERCIAL),
      treatments: demoTreatmentsForVendor(service.vendorId),
      reviews: demoReviewsForVendor(service.vendorId),
      tags: [
        service.categoryName,
        service.spaEnabled && "Spa/Office",
        service.hotelEnabled && "Hotel",
        service.homeEnabled && "Home"
      ].filter(Boolean) as string[]
    };
  }
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const service = await prisma.service.findUnique({
    where: { slug },
    include: { vendor: true, category: true, addons: true, staff: { include: { staff: true } } }
  });
  if (!service || !service.active) return null;
  const ent = await vendorEntitlement(service.vendorId);
  const vendor = sanitizePublicVendor(service.vendor, ent);
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
    service,
    vendor,
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
}

export async function getPublicVendor(slug: string) {
  if (usingDemoListings()) return demoVendorBySlug(slug);
  const { prisma } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: { services: { where: { active: true }, include: { category: true } } }
  });
  if (!vendor || vendor.visibility !== "public") return null;
  const ent = await vendorEntitlement(vendor.id);
  return { vendor: sanitizePublicVendor(vendor, ent), description: vendor.description, services: vendor.services };
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
