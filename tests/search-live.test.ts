import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), config: vi.fn(), entitlements: vi.fn(), availability: vi.fn() }));
vi.mock("../src/lib/live-db", () => ({ usingDemoListings: () => false }));
vi.mock("../src/lib/db", () => ({ prisma: { service: { findMany: mocks.findMany } }, getCommercialConfig: mocks.config }));
vi.mock("../src/lib/entitlements", () => ({ vendorEntitlements: mocks.entitlements }));
vi.mock("../src/lib/service-availability", () => ({ serviceAvailabilityLabels: mocks.availability }));
import { DEFAULT_COMMERCIAL, FREE_ENTITLEMENT } from "../src/lib/commercial";
import { searchServices } from "../src/lib/search";

const row = (index: number) => ({ id: `service-${index}`, vendorId: `vendor-${index}`, slug: `service-${index}`, name: "Treatment", durationMin: 60, basePriceKobo: 10000, spaEnabled: true, staff: [], category: { name: "Massage", slug: "massage" },
  vendor: { id: `vendor-${index}`, slug: `vendor-${index}`, businessName: "Test provider", state: "Lagos", city: "Lagos", neighbourhood: "Lekki", ratingAvg: 4, reviewCount: 0, verificationStatus: "unverified", owner: { email: "fixture@example.com" } } });
beforeEach(() => {
  vi.resetAllMocks(); mocks.findMany.mockResolvedValue(Array.from({ length: 30 }, (_, index) => row(index)));
  mocks.config.mockResolvedValue(DEFAULT_COMMERCIAL); mocks.entitlements.mockResolvedValue(new Map()); mocks.availability.mockResolvedValue(new Map());
});
describe("live Explore filtering and paging", () => {
  it("reports the complete result count while slicing the first page", async () => {
    const result = await searchServices({ take: 24 }); expect(result.total).toBe(30); expect(result.results).toHaveLength(24);
    expect(mocks.findMany.mock.calls[0][0].take).toBeUndefined();
    expect(mocks.availability.mock.calls[0][0]).toHaveLength(24);
  });
  it("returns remaining results on later pages without repeating the first page", async () => {
    const first = await searchServices({ take: 24, page: 1 }); const second = await searchServices({ take: 24, page: 2 });
    expect(second.total).toBe(30); expect(second.results).toHaveLength(6);
    const ids = new Set(first.results.map((result) => result.service.id)); expect(second.results.some((result) => ids.has(result.service.id))).toBe(false);
  });
  it("filters entitlement eligibility before pagination and counting", async () => {
    mocks.entitlements.mockResolvedValue(new Map([["vendor-29", { ...FREE_ENTITLEMENT, publicDirectContact: true, activePaid: true }]]));
    const result = await searchServices({ take: 1, publicContact: true }); expect(result.total).toBe(1); expect(result.results[0].service.id).toBe("service-29");
  });
  it("sends combined price, category, verification, setting and duration filters to the database", async () => {
    await searchServices({ category: "massage", minPrice: 100, maxPrice: 4000000, verified: true, locationType: "home", durationMin: 60, minRating: 4 });
    expect(mocks.findMany.mock.calls[0][0].where).toMatchObject({ category: { slug: { equals: "massage" } }, basePriceKobo: { gte: 100, lte: 4000000 }, homeEnabled: true, durationMin: { gte: 45, lte: 75 }, vendor: { AND: [expect.objectContaining({ verificationStatus: "verified", ratingAvg: { gte: 4 } })] } });
  });
  it("uses stable database ordering for price ties", async () => {
    await searchServices({ sort: "price" }); expect(mocks.findMany.mock.calls[0][0].orderBy).toEqual([{ basePriceKobo: "asc" }, { id: "asc" }]);
  });
});
