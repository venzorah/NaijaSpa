import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ service: vi.fn(), entitlement: vi.fn(), config: vi.fn() }));
vi.mock("../src/lib/live-db", () => ({ usingDemoListings: () => false }));
vi.mock("../src/lib/db", () => ({ prisma: { service: { findUnique: mock.service } }, getCommercialConfig: mock.config }));
vi.mock("../src/lib/entitlements", () => ({ vendorEntitlement: mock.entitlement }));
import { quotePublicService } from "../src/lib/catalog";
import { DEFAULT_COMMERCIAL, FREE_ENTITLEMENT } from "../src/lib/commercial";
beforeEach(() => {
  vi.resetAllMocks(); mock.config.mockResolvedValue(DEFAULT_COMMERCIAL); mock.entitlement.mockResolvedValue(FREE_ENTITLEMENT);
  mock.service.mockResolvedValue({ vendorId: "vendor", active: true, spaEnabled: true, hotelEnabled: false, homeEnabled: true, basePriceKobo: 7200000, vendor: { visibility: "public", applicationStatus: "approved" } });
});
describe("public service price checks", () => {
  it("returns the stored service price for an available treatment", async () => {
    expect((await quotePublicService("retained", "spa")).basePriceKobo).toBe(7200000);
  });
  it("returns a friendly 404 for a deleted treatment", async () => {
    mock.service.mockResolvedValue(null);
    await expect(quotePublicService("removed", "spa")).rejects.toMatchObject({ status: 404, message: "This service is no longer available. Please choose another treatment from Explore." });
    expect(mock.entitlement).not.toHaveBeenCalled();
  });
  it.each([
    { active: false, vendor: { visibility: "public", applicationStatus: "approved" } },
    { active: true, vendor: { visibility: "hidden", applicationStatus: "approved" } },
    { active: true, vendor: { visibility: "public", applicationStatus: "submitted" } }
  ])("rejects unavailable services and vendors", async (service) => {
    mock.service.mockResolvedValue(service);
    await expect(quotePublicService("service", "spa")).rejects.toMatchObject({ status: 404 });
  });
  it("rejects a location the treatment does not offer", async () => {
    await expect(quotePublicService("service", "hotel")).rejects.toMatchObject({ status: 400 });
  });
});
