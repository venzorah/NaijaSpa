import { FREE_ENTITLEMENT, locationAddonKobo, sanitizePublicVendor, quoteBooking } from "./commercial";
import { collectExploreCities, type ExploreCityFilters } from "./explore-cities";
import { PHOTOS, firstWellnessPhoto, publicWellnessPhoto } from "./photos";
import { usingDemoListings } from "./live-db";
import { placeRank, prismaServiceAreaFilter, serviceAreaState, vendorMatchesPlace } from "./nigeria";
import { tokenizeSearch } from "./query-match";
import { serviceAvailabilityLabels } from "./service-availability";
export type { SearchFilters } from "./search-types";
export type { ExploreCityCard, ExploreCityFilters } from "./explore-cities";
import type { SearchFilters, SearchTherapist } from "./search-types";

export async function searchServices(filters: SearchFilters) {
  if (usingDemoListings()) {
    const { demoSearch } = await import("./demo-catalog");
    return demoSearch(filters);
  }
  return searchLive(filters);
}

export async function listExploreCities(filters: ExploreCityFilters = {}) {
  if (usingDemoListings()) {
    const { demoExploreCities } = await import("./demo-catalog");
    return demoExploreCities(filters);
  }
  return liveExploreCities(filters);
}

async function liveExploreCities(filters: ExploreCityFilters) {
  const { prisma } = await import("./db");
  const vendors = await prisma.vendor.findMany({
    where: {
      visibility: "public",
      applicationStatus: "approved",
      ...(serviceAreaState(filters) ? prismaServiceAreaFilter(serviceAreaState(filters)) : {}),
      services: { some: { active: true } }
    },
    select: { state: true, city: true, neighbourhood: true, coverUrl: true }
  });
  return collectExploreCities(vendors, filters);
}

async function searchLive(filters: SearchFilters) {
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlements } = await import("./entitlements");
  const page = Math.max(1, filters.page ?? 1);
  const take = Math.min(100, Math.max(1, filters.take ?? 12));
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const tokenClause = (token: string) => ({
    OR: [
      { name: contains(token) },
      { description: contains(token) },
      { vendor: { businessName: contains(token) } },
      { vendor: { city: contains(token) } },
      { vendor: { state: contains(token) } },
      { vendor: { neighbourhood: contains(token) } },
      { category: { name: contains(token) } },
      { category: { slug: contains(token) } },
      { category: { synonyms: contains(token) } },
      { staff: { some: { staff: { name: contains(token) } } } }
    ]
  });
  const areaState = serviceAreaState(filters);
  const where: Record<string, unknown> = {
    active: true,
    vendor: {
      AND: [
        {
          visibility: "public",
          applicationStatus: "approved",
          ...(filters.verified ? { verificationStatus: "verified" } : {}),
          ...(filters.minRating ? { ratingAvg: { gte: filters.minRating } } : {})
        },
        ...(areaState ? [prismaServiceAreaFilter(areaState)] : [])
      ]
    },
    ...(filters.category
      ? { category: { slug: { equals: filters.category, mode: "insensitive" as const } } }
      : {}),
    ...(filters.minPrice != null ? { basePriceKobo: { gte: filters.minPrice } } : {}),
    ...(filters.maxPrice != null ? { basePriceKobo: { lte: filters.maxPrice } } : {}),
    ...(filters.durationMin ? { durationMin: { lte: filters.durationMin + 15, gte: filters.durationMin - 15 } } : {})
  };
  const tokens = tokenizeSearch(filters.q);
  if (tokens.length) {
    const mode = filters.matchMode ?? "all";
    if (mode === "any") {
      where.OR = tokens.flatMap((token) => tokenClause(token).OR);
    } else if (tokens.length === 1) {
      Object.assign(where, tokenClause(tokens[0]));
    } else {
      where.AND = tokens.map((token) => tokenClause(token));
    }
  }
  if (filters.locationType === "spa") where.spaEnabled = true;
  if (filters.locationType === "hotel") where.hotelEnabled = true;
  if (filters.locationType === "home") where.homeEnabled = true;
  if (filters.gender) {
    where.staff = { some: { staff: { active: true, gender: filters.gender } } };
  }

  const orderBy =
    filters.sort === "price"
      ? { basePriceKobo: "asc" as const }
      : filters.sort === "rating"
        ? { vendor: { ratingAvg: "desc" as const } }
        : { createdAt: "desc" as const };

  const placeFilter = Boolean(filters.state || filters.city || filters.neighbourhood || filters.gender);
  const rows = await prisma.service.findMany({
    where,
    include: {
      vendor: { include: { owner: { select: { email: true } } } },
      category: { select: { name: true, slug: true } },
      staff: { include: { staff: true } }
    },
    orderBy,
    ...(placeFilter ? {} : { skip: (page - 1) * take, take })
  });

  const [entitlements, config, availability] = await Promise.all([vendorEntitlements(rows.map((row) => row.vendorId)), getCommercialConfig(), serviceAvailabilityLabels(rows, filters.gender)]);
  const results = [];
  for (const row of rows) {
    const ent = entitlements.get(row.vendorId) ?? FREE_ENTITLEMENT;
    if (filters.publicContact && !ent.publicDirectContact) continue;
    const vendorPlace = {
      state: "state" in row.vendor ? String(row.vendor.state ?? "") : "",
      city: row.vendor.city,
      neighbourhood: row.vendor.neighbourhood
    };
    if (!vendorMatchesPlace(vendorPlace, filters)) continue;
    const publicVendor = sanitizePublicVendor(
      {
        id: row.vendor.id,
        slug: row.vendor.slug,
        businessName: row.vendor.businessName,
        state: vendorPlace.state,
        city: row.vendor.city,
        neighbourhood: row.vendor.neighbourhood,
        verificationStatus: row.vendor.verificationStatus,
        ratingAvg: Number(row.vendor.ratingAvg) || 0,
        reviewCount: row.vendor.reviewCount,
        logoUrl: publicWellnessPhoto(row.vendor.logoUrl, ""),
        coverUrl: firstWellnessPhoto(row.vendor.coverUrl, PHOTOS.bandSpa),
        privatePhone: row.vendor.privatePhone,
        privateWhatsapp: row.vendor.privateWhatsapp,
        instagramUrl: row.vendor.instagramUrl,
        owner: { email: row.vendor.owner?.email ?? "" }
      },
      ent
    );
    const loc = filters.locationType ?? "spa";
    const quote = quoteBooking({
      basePriceKobo: row.basePriceKobo,
      location: loc,
      locationAddonKobo: locationAddonKobo(loc, row),
      entitlement: ent,
      config
    });
    const therapists: SearchTherapist[] = row.staff
      .map((link) => link.staff)
      .filter((person) => {
        const gender = "gender" in person ? String(person.gender ?? "") : "";
        return person.active && (!filters.gender || gender === filters.gender);
      })
      .map((person) => ({
        id: person.id,
        name: person.name,
        gender: "gender" in person ? String(person.gender ?? "") : ""
      }));
    if (therapists.length === 0) {
      if (filters.gender) continue;
      therapists.push({ id: row.vendor.id, name: row.vendor.businessName, gender: "" });
    }
    results.push({
      service: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        durationMin: row.durationMin,
        imageUrl: firstWellnessPhoto(row.imageUrl, row.vendor.coverUrl, PHOTOS.massage),
        category: row.category.name,
        spaEnabled: row.spaEnabled,
        hotelEnabled: row.hotelEnabled,
        homeEnabled: row.homeEnabled
      },
      vendor: publicVendor,
      therapists,
      sponsored: ent.sponsoredEligible,
      enhanced: ent.enhancedVisibility,
      nextLabel: availability.get(row.id),
      quote
    });
  }

  if (filters.sort === "relevance") {
    results.sort(
      (a, b) =>
        placeRank(b.vendor, filters.rankPlace) - placeRank(a.vendor, filters.rankPlace) ||
        Number(b.enhanced) - Number(a.enhanced) ||
        b.vendor.ratingAvg - a.vendor.ratingAvg
    );
  }

  const total = results.length;
  const paged = placeFilter ? results.slice((page - 1) * take, page * take) : results;
  return { total, page, results: paged };
}
