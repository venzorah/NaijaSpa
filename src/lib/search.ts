import { sanitizePublicVendor, quoteBooking } from "./commercial";
import { usingDemoListings } from "./live-db";
export type { SearchFilters } from "./search-types";
import type { SearchFilters } from "./search-types";

export async function searchServices(filters: SearchFilters) {
  if (usingDemoListings()) {
    const { demoSearch } = await import("./demo-catalog");
    return demoSearch(filters);
  }
  const { prisma, getCommercialConfig } = await import("./db");
  const { vendorEntitlement } = await import("./entitlements");
  const page = Math.max(1, filters.page ?? 1);
  const take = 12;
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const where: Record<string, unknown> = {
    active: true,
    vendor: {
      visibility: "public",
      applicationStatus: "approved",
      ...(filters.city ? { city: contains(filters.city) } : {}),
      ...(filters.neighbourhood ? { neighbourhood: contains(filters.neighbourhood) } : {}),
      ...(filters.verified ? { verificationStatus: "verified" } : {}),
      ...(filters.minRating ? { ratingAvg: { gte: filters.minRating } } : {})
    },
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.minPrice != null ? { basePriceKobo: { gte: filters.minPrice } } : {}),
    ...(filters.maxPrice != null ? { basePriceKobo: { lte: filters.maxPrice } } : {}),
    ...(filters.durationMin ? { durationMin: { lte: filters.durationMin + 15, gte: filters.durationMin - 15 } } : {})
  };
  if (filters.q) {
    where.OR = [
      { name: contains(filters.q) },
      { description: contains(filters.q) },
      { vendor: { businessName: contains(filters.q) } },
      { category: { name: contains(filters.q) } },
      { category: { synonyms: contains(filters.q) } }
    ];
  }
  if (filters.locationType === "spa") where.spaEnabled = true;
  if (filters.locationType === "hotel") where.hotelEnabled = true;
  if (filters.locationType === "home") where.homeEnabled = true;

  const orderBy =
    filters.sort === "price"
      ? { basePriceKobo: "asc" as const }
      : filters.sort === "rating"
        ? { vendor: { ratingAvg: "desc" as const } }
        : { createdAt: "desc" as const };

  const [total, rows] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      include: { vendor: true, category: true },
      orderBy,
      skip: (page - 1) * take,
      take
    })
  ]);

  const config = await getCommercialConfig();
  const results = [];
  for (const row of rows) {
    const ent = await vendorEntitlement(row.vendorId);
    if (filters.publicContact && !ent.publicDirectContact) continue;
    const publicVendor = sanitizePublicVendor(
      {
        id: row.vendor.id,
        slug: row.vendor.slug,
        businessName: row.vendor.businessName,
        city: row.vendor.city,
        neighbourhood: row.vendor.neighbourhood,
        verificationStatus: row.vendor.verificationStatus,
        ratingAvg: row.vendor.ratingAvg,
        reviewCount: row.vendor.reviewCount,
        logoUrl: row.vendor.logoUrl,
        coverUrl: row.vendor.coverUrl,
        privatePhone: row.vendor.privatePhone,
        privateWhatsapp: row.vendor.privateWhatsapp
      },
      ent
    );
    const loc = filters.locationType ?? "spa";
    const quote = quoteBooking({
      basePriceKobo: row.basePriceKobo,
      location: loc,
      entitlement: ent,
      config
    });
    results.push({
      service: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        durationMin: row.durationMin,
        imageUrl: row.imageUrl,
        category: row.category.name,
        spaEnabled: row.spaEnabled,
        hotelEnabled: row.hotelEnabled,
        homeEnabled: row.homeEnabled
      },
      vendor: publicVendor,
      sponsored: ent.sponsoredEligible,
      enhanced: ent.enhancedVisibility,
      quote
    });
  }

  if (filters.sort === "relevance") {
    results.sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || b.vendor.ratingAvg - a.vendor.ratingAvg);
  }

  return { total, page, results };
}
