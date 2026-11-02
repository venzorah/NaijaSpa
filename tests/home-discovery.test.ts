import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ ranked: vi.fn(), promotions: vi.fn(), categories: vi.fn() }));
// A Next data-cache hit round-trips values through JSON, including dates.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => Promise<unknown>) => async () => JSON.parse(JSON.stringify(await fn())) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => createElement("a", { href }, children) }));
vi.mock("../src/components/service-carousel", () => ({ VendorCarousel: () => null }));
vi.mock("../src/lib/db", () => ({ prisma: {
  booking: { groupBy: mock.ranked }, service: { findMany: async () => [] }, vendor: { findMany: async () => [] },
  category: { findMany: mock.categories }, review: { findMany: async () => [] }, promotion: { findMany: mock.promotions }
} }));
import { getHomeDiscovery } from "../src/lib/home-discovery";
import { HomeDiscovery } from "../src/components/home-discovery";
import { homeOfferExpiry } from "../src/lib/home-offers";
const promotion = { id: "offer", code: "REAL10", description: "Test offer", percentOff: 10, amountKobo: 0, endsAt: new Date("2026-11-02T23:30:00Z"), maxRedemptions: null, usedCount: 0 };
beforeEach(() => { vi.clearAllMocks(); mock.ranked.mockResolvedValue([]); mock.categories.mockResolvedValue([]); mock.promotions.mockResolvedValue([promotion]); });
it("renders the offers section after a JSON cache round-trip", async () => {
  const result = await getHomeDiscovery(null); expect(typeof result.promotions[0].endsAt).toBe("string");
  const html = renderToStaticMarkup(await HomeDiscovery({ place: null }));
  expect(html).toContain("REAL10"); expect(html).toContain(homeOfferExpiry(promotion.endsAt.toISOString())); expect(html).not.toContain("Invalid Date");
});
it("uses Nigeria time even when an offer expires near midnight UTC", () => { expect(homeOfferExpiry(promotion.endsAt.toISOString())).toMatch(/^0?3\/11\/2026$/); });
it("does not advertise exhausted promotions", async () => { mock.promotions.mockResolvedValue([{ ...promotion, maxRedemptions: 1, usedCount: 1 }]); expect((await getHomeDiscovery(null)).promotions).toEqual([]); });
it("ranks completed bookings within the selected state", async () => { await getHomeDiscovery({ state: "Lagos", city: "", neighbourhood: "" }); expect(mock.ranked.mock.calls[0][0].where.status).toBe("completed"); expect(mock.ranked.mock.calls[0][0].where.service.vendor.applicationStatus).toBe("approved"); expect(mock.ranked.mock.calls[0][0].where.service.vendor.visibility).toBe("public"); expect(mock.ranked.mock.calls[0][0].where.service.vendor.OR).toBeDefined(); });
