import { beforeEach, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({ find: vi.fn(), alias: vi.fn(), reserve: vi.fn(), update: vi.fn(), current: vi.fn(), rows: vi.fn(), lock: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: { $transaction: async (fn: (tx: unknown) => unknown) => fn({
  $queryRaw: mocks.lock,
  vendor: { findUnique: mocks.find, findUniqueOrThrow: mocks.current, update: mocks.update, findMany: mocks.rows },
  vendorSlugAlias: { findUnique: mocks.alias, create: mocks.reserve }
}) } }));
import { availableVendorSlug, backfillVendorSlugs, updateVendorWithSlug, vendorSlugBase } from "../src/lib/vendor-slugs";
beforeEach(() => {
  vi.clearAllMocks(); mocks.find.mockResolvedValue(null); mocks.alias.mockResolvedValue(null);
  mocks.current.mockResolvedValue({ id: "v", slug: "vendor-old-id" }); mocks.rows.mockResolvedValue([]);
  mocks.update.mockImplementation(({data}) => Promise.resolve({id: "v", ...data}));
});
it("uses a safe business name rather than a generated account ID", () => {
  expect(vendorSlugBase("Cazy Luxury Spa")).toBe("vendor-cazy-luxury-spa");
  expect(vendorSlugBase("  Café & Spa! ")).toBe("vendor-cafe-spa");
  expect(vendorSlugBase("!!!")).toBe("vendor-spa");
});
it("avoids both existing businesses and reserved historic URLs", async () => {
  mocks.find.mockImplementation(({where}) => where.slug === "vendor-spa" ? {id:"other"} : null);
  mocks.alias.mockImplementation(({where}) => where.slug === "vendor-spa-2" ? {vendorId:"other"} : null);
  const tx = {vendor:{findUnique:mocks.find},vendorSlugAlias:{findUnique:mocks.alias}} as unknown as Prisma.TransactionClient;
  expect(await availableVendorSlug(tx,"vendor-spa","v")).toBe("vendor-spa-3");
});
it("saves business details and reserves old and new URLs in one transaction", async () => {
  await updateVendorWithSlug("v",{businessName:"Cazy Luxury Spa",privatePhone:"08012345678"});
  expect(mocks.lock).toHaveBeenCalledOnce();
  expect(mocks.reserve).toHaveBeenCalledWith({data:{slug:"vendor-old-id",vendorId:"v"}});
  expect(mocks.reserve).toHaveBeenCalledWith({data:{slug:"vendor-cazy-luxury-spa",vendorId:"v"}});
  expect(mocks.update).toHaveBeenCalledWith({where:{id:"v"},data:{businessName:"Cazy Luxury Spa",privatePhone:"08012345678",slug:"vendor-cazy-luxury-spa"}});
});
it("backfills existing profiles without touching their status or contact privacy", async () => {
  mocks.rows.mockResolvedValue([{id:"v",slug:"vendor-old-id",businessName:"Cazy Luxury Spa"}]);
  expect(await backfillVendorSlugs()).toEqual({total:1,changed:1});
  expect(mocks.update).toHaveBeenCalledWith({where:{id:"v"},data:{slug:"vendor-cazy-luxury-spa"}});
});
