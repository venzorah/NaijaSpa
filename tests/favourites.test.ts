import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  service: { findUnique: vi.fn() }, vendor: { findUnique: vi.fn() },
  favourite: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }
}));
vi.mock("../src/lib/db", () => ({ prisma: db }));
import { FavouriteTargetSchema, saveFavourite } from "../src/lib/favourites";
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.service.findUnique.mockResolvedValue({ vendorId: "vendor" });
  db.vendor.findUnique.mockResolvedValue({ id: "vendor" });
  db.favourite.findFirst.mockResolvedValue(null);
});
describe("favourite target validation and repeated saves", () => {
  it.each([{}, { serviceId: "" }, { vendorId: "   " }, { serviceId: null }, { vendorId: "vendor", extra: true }])("rejects an invalid or empty target %j", (input) => {
    expect(FavouriteTargetSchema.safeParse(input).success).toBe(false);
  });
  it("validates ownership when both target IDs are provided", async () => {
    await expect(saveFavourite("user", { serviceId: "service", vendorId: "another" })).rejects.toMatchObject({ status: 400 });
    expect(db.favourite.create).not.toHaveBeenCalled();
  });
  it("rejects a service that does not exist", async () => {
    db.service.findUnique.mockResolvedValue(null);
    await expect(saveFavourite("user", { serviceId: "missing" })).rejects.toMatchObject({ status: 404 });
  });
  it("rejects a provider that does not exist", async () => {
    db.vendor.findUnique.mockResolvedValue(null);
    await expect(saveFavourite("user", { vendorId: "missing" })).rejects.toMatchObject({ status: 404 });
  });
  it("reuses an existing service save even when it already has a provider", async () => {
    const existing = { id: "saved", userId: "user", vendorId: "vendor", serviceId: "service" };
    db.favourite.findFirst.mockResolvedValue(existing);
    expect(await saveFavourite("user", { serviceId: "service" })).toBe(existing);
    expect(db.favourite.findFirst).toHaveBeenCalledWith({ where: { userId: "user", serviceId: "service" } });
    expect(db.favourite.create).not.toHaveBeenCalled();
  });
  it("adds a validated provider association to a service-only save", async () => {
    db.favourite.findFirst.mockResolvedValue({ id: "saved", vendorId: null });
    await saveFavourite("user", { serviceId: "service", vendorId: "vendor" });
    expect(db.favourite.update).toHaveBeenCalledWith({ where: { id: "saved" }, data: { vendorId: "vendor" } });
  });
  it("keeps provider-only saves separate from saved treatments", async () => {
    await saveFavourite("user", { vendorId: "vendor" });
    expect(db.favourite.findFirst).toHaveBeenCalledWith({ where: { userId: "user", vendorId: "vendor", serviceId: null } });
    expect(db.favourite.create).toHaveBeenCalledWith({ data: { userId: "user", vendorId: "vendor", serviceId: undefined } });
  });
});
