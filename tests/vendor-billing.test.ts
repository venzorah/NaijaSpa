import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ subscriptions: vi.fn(), count: vi.fn(), payments: vi.fn(), vendor: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: {
  vendorSubscription: { findMany: mock.subscriptions }, payment: { count: mock.count, findMany: mock.payments }
} }));
vi.mock("../src/lib/vendor-auth", () => ({ requireVendor: mock.vendor }));
import { getVendorBillingHistory } from "../src/lib/vendor-billing";
import { GET } from "../src/app/api/vendor/subscriptions/billing/route";

beforeEach(() => {
  vi.clearAllMocks();
  mock.vendor.mockResolvedValue({ vendorId: "owned-vendor" });
  mock.subscriptions.mockResolvedValue([{ id: "owned-subscription", startsAt: new Date("2026-11-01"), endsAt: new Date("2026-12-01"), plan: { name: "Gold" } }]);
  mock.count.mockResolvedValue(12);
  mock.payments.mockResolvedValue([{ id: "payment", reference: "NS-OWNED", subscriptionId: "owned-subscription", createdAt: new Date("2026-11-01"), amountKobo: 18000000, status: "success" }]);
});

it("restricts billing to the authenticated vendor's subscription IDs and returns safe display fields", async () => {
  const response = await GET(new Request("http://localhost/api/vendor/subscriptions/billing?vendorId=foreign"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mock.subscriptions.mock.calls[0][0].where).toEqual({ vendorId: "owned-vendor" });
  expect(mock.payments.mock.calls[0][0].where).toEqual({ purpose: "subscription", subscriptionId: { in: ["owned-subscription"] } });
  expect(mock.payments.mock.calls[0][0].select).not.toHaveProperty("rawPayload");
  expect((await response.json()).rows[0]).toEqual({ id: "payment", reference: "NS-OWNED", plan: "Gold", startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z", createdAt: "2026-11-01T00:00:00.000Z", amountKobo: 18000000, status: "success" });
});
it("paginates ten records and searches references without dropping ownership", async () => {
  const result = await getVendorBillingHistory("owned-vendor", 2, "invoice");
  expect(result).toMatchObject({ page: 2, pageSize: 10, pages: 2, total: 12 });
  expect(mock.payments).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, where: { purpose: "subscription", subscriptionId: { in: ["owned-subscription"] }, reference: { contains: "invoice", mode: "insensitive" } } }));
});
it("clamps pages after search results shrink", async () => {
  mock.count.mockResolvedValue(0); mock.payments.mockResolvedValue([]);
  expect(await getVendorBillingHistory("owned-vendor", 20)).toMatchObject({ rows: [], page: 1, pages: 1, total: 0 });
  expect(mock.payments.mock.calls[0][0].skip).toBe(0);
});
it("rejects invalid pagination and unauthorised callers before any billing lookup", async () => {
  expect((await GET(new Request("http://localhost/api/vendor/subscriptions/billing?page=-1"))).status).toBe(400);
  expect(mock.subscriptions).not.toHaveBeenCalled();
  mock.vendor.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
  expect((await GET(new Request("http://localhost/api/vendor/subscriptions/billing"))).status).toBe(403);
  expect(mock.subscriptions).not.toHaveBeenCalled();
});
