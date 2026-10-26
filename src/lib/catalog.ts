import { unstable_cache } from "next/cache";
import { usingDemoListings } from "./live-db";
import { withTimeout } from "./timeout";
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

export type PublicCategory = {
  slug: string;
  name: string;
  imageUrl: string | null;
  description: string;
  metaTitle: string;
  metaDescription: string;
};

/** Public category tiles and landings. Never select imagePayload — that column 404s the page on hosts without the migration. */
export async function getPublicCategories(): Promise<PublicCategory[]> {
  const demo: PublicCategory[] = demoCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.imageUrl,
    description: "",
    metaTitle: "",
    metaDescription: ""
  }));
  if (usingDemoListings()) return demo;
  try {
    const { prisma } = await import("./db");
    const rows = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        imageUrl: true,
        description: true,
        metaTitle: true,
        metaDescription: true
      }
    });
    return rows.length ? rows : demo;
  } catch {
    return demo;
  }
}

export async function getHomeCatalog(place?: LivePlace | null) {
  return unstable_cache(() => loadHomeCatalog(place ?? null), ["home-catalog", placeCacheKey(place)], {
    revalidate: 30,
    tags: ["home-catalog"]
  })();
}

async function loadHomeCatalog(place: LivePlace | null) {
  const [limits, hero] = await withTimeout(Promise.all([resolveHomeFeedLimits(), resolveHomeHero()]), 4000).catch(
    (): [HomeFeedConfig, HomeHeroPayload] => [DEFAULT_HOME_FEED_CONFIG, demoHomeHero()]
  );
  if (usingDemoListings()) return demoHomePayload(limits, place, hero);
  try {
  const { prisma } = await import("./db");
  const { vendorEntitlements } = await import("./entitlements");
  const now = new Date();
  const [categories, services, faqs, campaigns] = await withTimeout(
    Promise.all([
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
    ]),
    6000
  );

  const entitlements = await withTimeout(
    vendorEntitlements([...services.map((s) => s.vendorId), ...campaigns.map((c) => c.vendorId)]),
    4000
  ).catch(() => new Map());

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
        ratingAvg: Number(vendor.ratingAvg) || 0,
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
      ratingAvg: Number(s.vendor.ratingAvg) || 0
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
    if (!usingDemoListings()) {
      return { demo: false, categories: [], rails: { featured: [], premium: [], promo: [] }, nearby: [], faqs: [], hero };
    }
    return demoHomePayload(limits, place, hero);
  }
}

function initialsName(name: string | null | undefined) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
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

const PUBLIC_GALLERY_IMAGES = {
  orderBy: { sortOrder: "asc" as const },
  select: { id: true, url: true, caption: true, therapistName: true }
};

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
  slug = decodeURIComponent(slug);
  if (usingDemoListings()) return demoPublicService(slug);
  try {
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const service = await prisma.service.findUnique({
    where: { slug },
    include: {
      vendor: {
        include: {
          owner: { select: { email: true } },
          galleries: {
            include: { images: PUBLIC_GALLERY_IMAGES },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      category: { select: { name: true, slug: true } },
      addons: true,
      staff: { include: { staff: true } }
    }
  });
  if (!service) return usingDemoListings() ? demoPublicService(slug) : null;
  if (!service.active) return null;
  const ent = await vendorEntitlement(service.vendorId);
  const vendor = sanitizePublicVendor(
    {
      id: service.vendor.id,
      slug: service.vendor.slug,
      businessName: service.vendor.businessName,
      description: service.vendor.description,
      logoUrl: service.vendor.logoUrl,
      coverUrl: publicWellnessPhoto(service.vendor.coverUrl, PHOTOS.bandSpa),
      state: service.vendor.state,
      city: service.vendor.city,
      neighbourhood: service.vendor.neighbourhood,
      verificationStatus: service.vendor.verificationStatus,
      ratingAvg: Number(service.vendor.ratingAvg) || 0,
      reviewCount: Number(service.vendor.reviewCount) || 0,
      cancellationPolicy: service.vendor.cancellationPolicy,
      privatePhone: service.vendor.privatePhone,
      privateWhatsapp: service.vendor.privateWhatsapp,
      instagramUrl: service.vendor.instagramUrl,
      owner: service.vendor.owner
    },
    ent
  );
  const cfg = await getCommercialConfig();
  const treatments = await prisma.service.findMany({
    where: { vendorId: service.vendorId, active: true },
    select: { id: true, slug: true, name: true, durationMin: true, basePriceKobo: true },
    orderBy: { durationMin: "asc" }
  });
  let reviews: Array<{ vendorId: string; author: string; rating: number; createdAt: string; body: string }> = [];
  try {
    const reviewRows = await prisma.review.findMany({
      where: { status: "published", booking: { serviceId: service.id } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    reviews = reviewRows.map((r) => ({
      vendorId: r.vendorId,
      author: initialsName(r.user?.name),
      rating: Number(r.rating) || 0,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
      body: String(r.body ?? "")
    }));
  } catch {
    reviews = [];
  }
  return {
    demo: false,
    service: {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      imageUrl: publicWellnessPhoto(service.imageUrl, PHOTOS.massage),
      spaEnabled: service.spaEnabled,
      hotelEnabled: service.hotelEnabled,
      homeEnabled: service.homeEnabled
    },
    vendor,
    galleries: mapPublicGalleries(service.vendor.galleries),
    quotes: locationQuotes(service, ent, cfg),
    treatments,
    reviews,
    tags: [
      service.category?.name,
      service.spaEnabled && "Spa/Office",
      service.hotelEnabled && "Hotel",
      service.homeEnabled && "Home"
    ].filter(Boolean) as string[]
  };
  } catch {
    if (!usingDemoListings()) return null;
    return demoPublicService(slug);
  }
}

export async function getPublicVendor(slug: string) {
  slug = decodeURIComponent(slug);
  if (usingDemoListings()) return demoVendorBySlug(slug);
  try {
  const { prisma } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      owner: { select: { email: true } },
      services: { where: { active: true }, include: { category: { select: { name: true, slug: true } } } },
      galleries: { include: { images: PUBLIC_GALLERY_IMAGES }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      videoLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });
  if (!vendor) return usingDemoListings() ? demoVendorBySlug(slug) : null;
  if (vendor.visibility !== "public") return null;
  const ent = await vendorEntitlement(vendor.id);
  return {
    vendor: sanitizePublicVendor(
      {
        id: vendor.id,
        slug: vendor.slug,
        businessName: vendor.businessName,
        description: vendor.description,
        logoUrl: vendor.logoUrl,
        coverUrl: publicWellnessPhoto(vendor.coverUrl, PHOTOS.bandSpa),
        state: vendor.state,
        city: vendor.city,
        neighbourhood: vendor.neighbourhood,
        verificationStatus: vendor.verificationStatus,
        ratingAvg: Number(vendor.ratingAvg) || 0,
        reviewCount: Number(vendor.reviewCount) || 0,
        cancellationPolicy: vendor.cancellationPolicy,
        privatePhone: vendor.privatePhone,
        privateWhatsapp: vendor.privateWhatsapp,
        instagramUrl: vendor.instagramUrl,
        owner: vendor.owner
      },
      ent
    ),
    description: vendor.description,
    services: vendor.services.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      durationMin: s.durationMin,
      basePriceKobo: s.basePriceKobo,
      imageUrl: publicWellnessPhoto(s.imageUrl, PHOTOS.massage)
    })),
    galleries: mapPublicGalleries(vendor.galleries),
    videoLinks: publicVideoLinks(
      vendor.videoLinks.map((v) => ({ id: v.id, url: v.url, title: v.title })),
      ent
    )
  };
  } catch {
    if (!usingDemoListings()) return null;
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
