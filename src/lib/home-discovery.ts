import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { prismaServiceAreaFilter, serviceAreaState, type LivePlace } from "./nigeria";

export function getHomeDiscovery(place: LivePlace | null) {
  const state = serviceAreaState(place);
  return unstable_cache(async () => {
    const vendor = { visibility: "public", applicationStatus: "approved", ...(state ? prismaServiceAreaFilter(state) : {}) };
    const service = { active: true, vendor };
    const now = new Date();
    const [ranked, verified, collections, reviews, promotions] = await Promise.all([
      prisma.booking.groupBy({ by: ["serviceId"], where: { status: "completed", service }, _count: { _all: true }, orderBy: [{ _count: { serviceId: "desc" } }, { serviceId: "asc" }], take: 8 }),
      prisma.vendor.findMany({ where: { ...vendor, verificationStatus: "verified", services: { some: { active: true } } }, select: { slug: true, businessName: true, city: true, neighbourhood: true, coverUrl: true, ratingAvg: true }, take: 8, orderBy: { businessName: "asc" } }),
      prisma.category.findMany({ where: { active: true, services: { some: service } }, select: { slug: true, name: true, imageUrl: true, _count: { select: { services: { where: service } } } }, orderBy: { sortOrder: "asc" }, take: 4 }),
      prisma.review.findMany({ where: { status: "published", booking: { status: "completed", service } }, select: { id: true, body: true, rating: true, user: { select: { name: true } }, booking: { select: { service: { select: { name: true, slug: true } } } } }, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.promotion.findMany({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true, code: true, description: true, percentOff: true, amountKobo: true, endsAt: true, maxRedemptions: true, usedCount: true }, orderBy: { endsAt: "asc" }, take: 20 })
    ]);
    const popular = ranked.length ? await prisma.service.findMany({ where: { ...service, id: { in: ranked.map(row => row.serviceId) } }, select: {
      id: true, slug: true, name: true, imageUrl: true, basePriceKobo: true, durationMin: true,
      vendor: { select: { slug: true, businessName: true, state: true, city: true, neighbourhood: true, ratingAvg: true, reviewCount: true, verificationStatus: true, logoUrl: true } }
    } }) : [];
    const counts = new Map(ranked.map(row => [row.serviceId, row._count._all]));
    return {
      popular: popular.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)).map(({ vendor, ...service }) => ({ service, vendor, tags: [`${counts.get(service.id)} completed bookings`] })),
      verified, collections, reviews,
      promotions: promotions.filter(p => p.maxRedemptions == null || p.usedCount < p.maxRedemptions).slice(0, 2).map(p => ({ ...p, endsAt: p.endsAt.toISOString() }))
    };
  }, ["home-discovery", state], { revalidate: 30, tags: ["home-catalog"] })();
}
