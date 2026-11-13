import { unstable_cache } from "next/cache";
import { duringNextBuild, usingDemoListings } from "./live-db";
import { viewCount } from "./listing-views";
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
import { filterByServiceArea, prismaServiceAreaFilter, serviceAreaState, sortByPlace, type LivePlace } from "./nigeria";
import { type HomeHeroPayload } from "./home-hero";
import {
  collectedManualServiceIds,
  collectedManualVendorIds,
  DEFAULT_HOME_SECTIONS,
  homeSection,
  HOME_SECTIONS_CONFIG_KEY,
  parseHomeSections,
  pickManualIds,
  type HomeSection
} from "./home-sections";
import { PHOTOS, publicWellnessPhoto } from "./photos";
import { serviceAvailabilityLabels } from "./service-availability";
import { LIVE_SERVICE_WHERE, PUBLIC_LIVE_VENDOR_WHERE } from "./vendor-public-profile";

export { usingDemoListings } from "./live-db";
export type { HomeCard, HomeFeedConfig, HomeRails, NearbyVendor } from "./home-types";
export { DEFAULT_HOME_FEED_CONFIG, parseHomeFeedConfig } from "./home-types";

async function resolveHomeFeedLimits(): Promise<HomeFeedConfig> {
  if (duringNextBuild() || !process.env.DATABASE_URL) return DEFAULT_HOME_FEED_CONFIG;
  try {
    const { getHomeFeedConfig } = await import("./db");
    return await getHomeFeedConfig();
  } catch {
    return DEFAULT_HOME_FEED_CONFIG;
  }
}

async function resolveHomeHero(): Promise<HomeHeroPayload> {
  if (duringNextBuild() || !process.env.DATABASE_URL) return demoHomeHero();
  try {
    const { getHomeHeroPayload } = await import("./db");
    return await getHomeHeroPayload();
  } catch {
    return { ...demoHomeHero(), ads: usingDemoListings() ? demoHomeHero().ads : [] };
  }
}

async function resolveHomeSections(): Promise<HomeSection[]> {
  if (duringNextBuild() || !process.env.DATABASE_URL) return DEFAULT_HOME_SECTIONS;
  try {
    const { prisma } = await import("./db");
    const row = await prisma.systemConfig.findUnique({ where: { key: HOME_SECTIONS_CONFIG_KEY } });
    return parseHomeSections(row?.value);
  } catch {
    return DEFAULT_HOME_SECTIONS;
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

function demoHomePayload(limits: HomeFeedConfig, place?: LivePlace | null, hero?: HomeHeroPayload, layout: HomeSection[] = DEFAULT_HOME_SECTIONS) {
  const rails = demoHomeRails(limits, place);
  return {
    demo: true as const,
    categories: demoCategories,
    rails,
    spotlight: homeSection(layout, "spotlight").visible ? rails.featured.filter((card) => card.sponsored) : [],
    nearby: homeSection(layout, "nearby").visible
      ? sortByPlace(filterByServiceArea(demoNearbyVendors(), place, (v) => v), place, (v) => v).slice(0, limits.nearby)
      : [],
    faqs: demoFaqs,
    hero: hero ?? demoHomeHero(),
    layout
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
  const [limits, hero, layout] = await withTimeout(
    Promise.all([resolveHomeFeedLimits(), resolveHomeHero(), resolveHomeSections()]),
    4000
  ).catch(
    (): [HomeFeedConfig, HomeHeroPayload, HomeSection[]] => [
      DEFAULT_HOME_FEED_CONFIG,
      { ...demoHomeHero(), ads: usingDemoListings() ? demoHomeHero().ads : [] },
      DEFAULT_HOME_SECTIONS
    ]
  );
  if (duringNextBuild() || usingDemoListings()) return demoHomePayload(limits, place, hero, layout);
  try {
  const { prisma } = await import("./db");
  const { vendorEntitlements } = await import("./entitlements");
  const now = new Date();
  const pinnedServiceIds = collectedManualServiceIds(layout);
  const pinnedVendorIds = collectedManualVendorIds(layout);
  const areaVendor = { ...PUBLIC_LIVE_VENDOR_WHERE, ...(serviceAreaState(place) ? prismaServiceAreaFilter(serviceAreaState(place)) : {}) };
  const [categories, services, faqs, campaigns] = await withTimeout(
    Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, imageUrl: true }
    }).then((rows) => (rows.length ? rows : demoCategories.map(({ slug, name, imageUrl }) => ({ slug, name, imageUrl })))),
    prisma.service.findMany({
      where: {
        ...LIVE_SERVICE_WHERE,
        OR: [
          { vendor: areaVendor },
          ...(pinnedServiceIds.length
            ? [{ id: { in: pinnedServiceIds }, vendor: PUBLIC_LIVE_VENDOR_WHERE }]
            : []),
          ...(pinnedVendorIds.length
            ? [{ vendorId: { in: pinnedVendorIds }, vendor: PUBLIC_LIVE_VENDOR_WHERE }]
            : [])
        ]
      },
      select: {
        id: true,
        vendorId: true,
        slug: true,
        name: true,
        imageUrl: true,
        basePriceKobo: true,
        durationMin: true,
        staff: { select: { staff: { select: { id: true, active: true } } } },
        spaEnabled: true,
        hotelEnabled: true,
        homeEnabled: true,
        vendor: {
          select: {
            id: true,
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
            privateWhatsapp: true,
            publicContactEnabled: true
          }
        },
        category: { select: { name: true, slug: true } }
      },
      take: Math.min(120, homeServicePoolTake(limits) + pinnedServiceIds.length + pinnedVendorIds.length)
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

  const missingPinned = pinnedServiceIds.filter((id) => !services.some((s) => s.id === id));
  if (missingPinned.length) {
    const extra = await prisma.service.findMany({
      where: {
        id: { in: missingPinned },
        ...LIVE_SERVICE_WHERE,
        vendor: PUBLIC_LIVE_VENDOR_WHERE
      },
      select: {
        id: true,
        vendorId: true,
        slug: true,
        name: true,
        imageUrl: true,
        basePriceKobo: true,
        durationMin: true,
        staff: { select: { staff: { select: { id: true, active: true } } } },
        spaEnabled: true,
        hotelEnabled: true,
        homeEnabled: true,
        vendor: {
          select: {
            id: true,
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
            privateWhatsapp: true,
            publicContactEnabled: true
          }
        },
        category: { select: { name: true, slug: true } }
      }
    });
    services.push(...extra);
  }

  const [entitlements, availability] = await Promise.all([withTimeout(
    vendorEntitlements([...services.map((s) => s.vendorId), ...campaigns.map((c) => c.vendorId)]),
    4000
  ).catch(() => new Map()),
  withTimeout(serviceAvailabilityLabels(services, undefined, now), 4000).catch(() => new Map<string, string | undefined>())]);
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
      nextLabel: availability.get(s.id),
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

  const servicesForVendor = (vendorId: string, slugs: string[] = []) =>
    services.filter((row) => row.vendorId === vendorId && (!slugs.length || (row.category?.slug && slugs.includes(row.category.slug))));
  const servicesForCategory = (slug: string) => services.filter((row) => row.category?.slug === slug);
  const matchesSectionCategories = (card: HomeCard, slugs: string[]) => {
    if (!slugs.length) return true;
    const service = byId.get(card.service.id);
    return Boolean(service?.category?.slug && slugs.includes(service.category.slug));
  };
  const manualCards = (sectionId: "featured" | "premium" | "promo" | "spotlight", badge: string, limit: number) => {
    const section = homeSection(layout, sectionId);
    return pickManualIds(
      section,
      limit,
      (id) => byId.get(id),
      (vendorId) => servicesForVendor(vendorId, section.categorySlugs),
      servicesForCategory,
      (row) => row.id
    ).map((row) => cardFromService(row, badge, false));
  };

  const autoRail = (campaignCards: HomeCard[], pool: HomeCard[], badge: string, limit: number, slugs: string[]) =>
    sortByPlace(
      fill(
        filterByServiceArea(campaignCards.filter((card) => matchesSectionCategories(card, slugs)), place, (c) => c.vendor),
        pool.filter((card) => matchesSectionCategories(card, slugs)),
        badge,
        limit
      ),
      place,
      (c) => c.vendor
    );

  const allCards = sortByPlace(
    filterByServiceArea(
      services.map((s) => {
        const ent = entitlements.get(s.vendorId) ?? FREE_ENTITLEMENT;
        const sponsored = campaigns.some((c) => c.vendorId === s.vendorId && (!c.serviceId || c.serviceId === s.id));
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
  const railFor = (
    id: "featured" | "premium" | "promo",
    campaignCards: HomeCard[],
    pool: HomeCard[],
    badge: string,
    limit: number
  ) => {
    const section = homeSection(layout, id);
    if (!section.visible) return [];
    if (section.source === "manual") return manualCards(id, badge, limit);
    return autoRail(campaignCards, pool, badge, limit, section.categorySlugs);
  };
  const rails: HomeRails = {
    featured: railFor("featured", featured, allCards, "Featured", limits.featured),
    premium: railFor("premium", premiumFromAds, premiumPool, "Premium", limits.premium),
    promo: railFor("promo", promo, promo, "Promo", limits.promo)
  };
  const spotlightSection = homeSection(layout, "spotlight");
  const sponsoredUnion = [...new Map([...rails.featured, ...rails.premium, ...rails.promo].filter((c) => c.sponsored).map((c) => [c.service.id, c])).values()];
  const spotlight = !spotlightSection.visible
    ? []
    : spotlightSection.source === "manual"
      ? manualCards("spotlight", "Featured", limits.featured)
      : sponsoredUnion.filter((card) => matchesSectionCategories(card, spotlightSection.categorySlugs));

  const nearbySection = homeSection(layout, "nearby");
  const nearbyFromService = (s: (typeof services)[number]): NearbyVendor => ({
    slug: s.vendor.slug,
    businessName: s.vendor.businessName,
    state: s.vendor.state,
    city: s.vendor.city,
    neighbourhood: s.vendor.neighbourhood,
    coverUrl: publicWellnessPhoto(s.vendor.coverUrl, PHOTOS.bandSpa),
    ratingAvg: Number(s.vendor.ratingAvg) || 0
  });
  const nearbyByVendorId = new Map<string, NearbyVendor>();
  for (const s of services) {
    if (nearbyByVendorId.has(s.vendorId)) continue;
    nearbyByVendorId.set(s.vendorId, nearbyFromService(s));
  }
  let nearby: NearbyVendor[] = [];
  if (nearbySection.visible) {
    if (nearbySection.source === "manual") {
      const missingVendorIds = nearbySection.vendorIds.filter((id) => !nearbyByVendorId.has(id));
      if (missingVendorIds.length) {
        const extraVendors = await prisma.vendor.findMany({
          where: { id: { in: missingVendorIds }, ...PUBLIC_LIVE_VENDOR_WHERE },
          select: {
            id: true,
            slug: true,
            businessName: true,
            state: true,
            city: true,
            neighbourhood: true,
            coverUrl: true,
            ratingAvg: true
          }
        });
        for (const vendor of extraVendors) {
          nearbyByVendorId.set(vendor.id, {
            slug: vendor.slug,
            businessName: vendor.businessName,
            state: vendor.state,
            city: vendor.city,
            neighbourhood: vendor.neighbourhood,
            coverUrl: publicWellnessPhoto(vendor.coverUrl, PHOTOS.bandSpa),
            ratingAvg: Number(vendor.ratingAvg) || 0
          });
        }
      }
      nearby = nearbySection.vendorIds.map((id) => nearbyByVendorId.get(id)).filter((row): row is NearbyVendor => Boolean(row)).slice(0, limits.nearby);
      if (!nearby.length && nearbySection.categorySlugs.length) {
        const seen = new Set<string>();
        for (const slug of nearbySection.categorySlugs) {
          for (const s of servicesForCategory(slug)) {
            if (seen.has(s.vendorId) || nearby.length >= limits.nearby) continue;
            seen.add(s.vendorId);
            nearby.push(nearbyFromService(s));
          }
        }
      }
    } else {
      const pool = nearbySection.categorySlugs.length
        ? services.filter((s) => s.category?.slug && nearbySection.categorySlugs.includes(s.category.slug))
        : services;
      const autoMap = new Map<string, NearbyVendor>();
      for (const s of pool) {
        if (autoMap.has(s.vendor.slug)) continue;
        autoMap.set(s.vendor.slug, nearbyFromService(s));
      }
      nearby = sortByPlace(filterByServiceArea([...autoMap.values()], place, (v) => v), place, (v) => v).slice(0, limits.nearby);
    }
  }

  return {
    demo: false,
    categories,
    rails,
    spotlight,
    nearby,
    faqs,
    hero,
    layout
  };
  } catch {
    if (!usingDemoListings()) {
      return { demo: false, categories: demoCategories, rails: { featured: [], premium: [], promo: [] }, spotlight: [], nearby: [], faqs: [], hero, layout };
    }
    return demoHomePayload(limits, place, hero, layout);
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
    service: { ...service, publicViewCount: 0 },
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
  const alias = await prisma.serviceSlugAlias.findUnique({ where: { slug }, select: { serviceId: true } });
  const service = await prisma.service.findUnique({
    where: alias ? { id: alias.serviceId } : { slug },
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
  if (!service.active || service.vendor.visibility !== "public" || service.vendor.applicationStatus !== "approved") return null;
  const [ent, cfg, treatments, reviewRows] = await Promise.all([
    vendorEntitlement(service.vendorId),
    getCommercialConfig(),
    prisma.service.findMany({
      where: { vendorId: service.vendorId, active: true },
      select: { id: true, slug: true, name: true, durationMin: true, basePriceKobo: true },
      orderBy: { durationMin: "asc" }
    }),
    prisma.review.findMany({
      where: { status: "published", booking: { serviceId: service.id } },
      select: { vendorId: true, rating: true, createdAt: true, body: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, take: 20
    }).catch(() => [])
  ]);
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
      publicViewCount: viewCount(service.vendor),
      cancellationPolicy: service.vendor.cancellationPolicy,
      privatePhone: service.vendor.privatePhone,
      privateWhatsapp: service.vendor.privateWhatsapp,
      instagramUrl: service.vendor.instagramUrl,
      publicContactEnabled: service.vendor.publicContactEnabled,
      owner: service.vendor.owner
    },
    ent
  );
  const reviews = reviewRows.map((r) => ({
      vendorId: r.vendorId,
      author: initialsName(r.user?.name),
      rating: Number(r.rating) || 0,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
      body: String(r.body ?? "")
    }));
  return {
    demo: false,
    therapists: service.staff.filter((link) => link.staff.active).map((link) => ({ id: link.staff.id, name: link.staff.name })),
    service: {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      imageUrl: publicWellnessPhoto(service.imageUrl, PHOTOS.massage),
      spaEnabled: service.spaEnabled,
      hotelEnabled: service.hotelEnabled,
      homeEnabled: service.homeEnabled,
      publicViewCount: viewCount(service)
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
  const alias = await prisma.vendorSlugAlias.findUnique({ where: { slug }, select: { vendorId: true } });
  const vendor = await prisma.vendor.findUnique({
    where: alias ? { id: alias.vendorId } : { slug },
    include: {
      owner: { select: { email: true } },
      services: { where: LIVE_SERVICE_WHERE, include: { category: { select: { name: true, slug: true } } } },
      galleries: { include: { images: PUBLIC_GALLERY_IMAGES }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      videoLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });
  if (!vendor) return usingDemoListings() ? demoVendorBySlug(slug) : null;
  if (vendor.visibility !== "public" || vendor.applicationStatus !== "approved" || vendor.services.length === 0) return null;
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
        publicViewCount: viewCount(vendor),
        cancellationPolicy: vendor.cancellationPolicy,
        privatePhone: vendor.privatePhone,
        privateWhatsapp: vendor.privateWhatsapp,
        instagramUrl: vendor.instagramUrl,
        publicContactEnabled: vendor.publicContactEnabled,
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
      imageUrl: publicWellnessPhoto(s.imageUrl, PHOTOS.massage),
      publicViewCount: viewCount(s)
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
  if (!["spa", "hotel", "home"].includes(location)) throw Object.assign(new Error("Choose a valid service location"), { status: 400 });
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
  const service = await prisma.service.findUnique({ where: { id: serviceId }, include: { vendor: { select: { visibility: true, applicationStatus: true } } } });
  if (!service || !service.active || service.vendor.visibility !== "public" || service.vendor.applicationStatus !== "approved") {
    throw Object.assign(new Error("This service is no longer available. Please choose another treatment from Explore."), { status: 404 });
  }
  if (!(location === "spa" ? service.spaEnabled : location === "hotel" ? service.hotelEnabled : service.homeEnabled)) {
    throw Object.assign(new Error("This service is not offered at the selected location."), { status: 400 });
  }
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
