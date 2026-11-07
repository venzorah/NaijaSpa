import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ vendor: vi.fn(), find: vi.fn(), alias: vi.fn(), create: vi.fn(), reserve: vi.fn(), query: vi.fn(), rows: vi.fn(), update: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: {
  vendor: { findUniqueOrThrow: mock.vendor },
  $transaction: async (fn: (tx: unknown) => unknown) => fn({ $queryRaw: mock.query, service: { findUnique: mock.find, create: mock.create, findMany: mock.rows, update: mock.update }, serviceSlugAlias: { findUnique: mock.alias, create: mock.reserve } })
} }));
import { availableServiceSlug, backfillServiceSlugs, createServiceWithSlug, serviceSlugBase } from "../src/lib/service-slugs";
import type { Prisma } from "@prisma/client";
beforeEach(() => {
  vi.clearAllMocks(); mock.find.mockResolvedValue(null); mock.alias.mockResolvedValue(null);
  mock.vendor.mockResolvedValue({ businessName: "Simon Spa", slug: "vendor-internal" });
  mock.create.mockResolvedValue({ id: "service", slug: "swedish-massage-simon-spa" }); mock.rows.mockResolvedValue([]);
});
it("uses the service and business name with clean, bounded URL characters", () => {
  expect(serviceSlugBase("Swedish Massage", "Simon Spa")).toBe("swedish-massage-simon-spa");
  expect(serviceSlugBase("  Thérapy & Oils! ", "Spa Lagos")).toBe("therapy-oils-spa-lagos");
  expect(serviceSlugBase("!!!", "!!!")).toBe("service-spa");
  expect(serviceSlugBase("a".repeat(200), "b".repeat(200)).length).toBe(201);
});
it("reserves current and historic URLs before allocating a numeric suffix", async () => {
  mock.find.mockImplementation(({ where }: { where: { slug: string } }) => Promise.resolve(where.slug === "massage-spa" ? { id: "other" } : null));
  mock.alias.mockImplementation(({ where }: { where: { slug: string } }) => Promise.resolve(where.slug === "massage-spa-2" ? { serviceId: "historic" } : null));
  const tx = { service: { findUnique: mock.find }, serviceSlugAlias: { findUnique: mock.alias } } as unknown as Prisma.TransactionClient;
  expect(await availableServiceSlug(tx, "massage-spa")).toBe("massage-spa-3");
});
it("creates the service and its URL reservation within the namespace lock", async () => {
  await createServiceWithSlug({ vendorId: "vendor", categoryId: "category", name: "Swedish Massage", basePriceKobo: 2500000, durationMin: 60 });
  expect(mock.query).toHaveBeenCalledTimes(1);
  expect(mock.create).toHaveBeenCalledWith({ data: expect.objectContaining({ slug: "swedish-massage-simon-spa", vendorId: "vendor" }) });
  expect(mock.reserve).toHaveBeenCalledWith({ data: { slug: "swedish-massage-simon-spa", serviceId: "service" } });
});
it("backfills URLs while retaining every old URL and changing only slug fields", async () => {
  mock.rows.mockResolvedValue([{ id: "existing", slug: "massage-random", name: "Swedish Massage", vendor: { businessName: "Simon Spa", slug: "vendor" } }]);
  expect(await backfillServiceSlugs()).toEqual([{ id: "existing", before: "massage-random", after: "swedish-massage-simon-spa" }]);
  expect(mock.reserve).toHaveBeenCalledWith({ data: { slug: "massage-random", serviceId: "existing" } });
  expect(mock.update).toHaveBeenCalledWith({ where: { id: "existing" }, data: { slug: "swedish-massage-simon-spa" } });
  expect(mock.rows.mock.calls[0][0].where).toEqual({ slugAliases: { none: {} } });
});
it("does not regenerate established URLs on later backfill runs", async () => {
  expect(await backfillServiceSlugs()).toEqual([]);
  expect(mock.update).not.toHaveBeenCalled();
});
