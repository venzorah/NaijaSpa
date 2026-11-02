import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ role: "super_admin", create: vi.fn(), find: vi.fn(), update: vi.fn(), remove: vi.fn(), vendor: vi.fn(), service: vi.fn(), audit: vi.fn(), invalidate: vi.fn() }));
vi.mock("../src/lib/auth", () => ({ getSession: async () => ({ id: "admin", role: mock.role }), requireUser: (user: unknown) => user }));
vi.mock("../src/lib/db", () => ({ prisma: { campaign: { create: mock.create, findUnique: mock.find, update: mock.update, delete: mock.remove }, vendor: { findUnique: mock.vendor }, service: { findFirst: mock.service } } }));
vi.mock("../src/lib/audit", () => ({ audit: mock.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mock.invalidate }));
import { POST } from "../src/app/api/admin/campaigns/route";
import { PATCH, DELETE } from "../src/app/api/admin/campaigns/[id]/route";
import { campaignStatus } from "../src/lib/campaigns";
import { visibleAdminScreens } from "../src/lib/admin";
import { publicContentUrl } from "../src/lib/public-content";
const body = { vendorId: "vendor", serviceId: "service", placement: "homepage_featured", startsAt: "2026-11-02T09:00:00+01:00", endsAt: "2026-11-03T09:00:00+01:00", priority: 2, active: true };
const req = (data: unknown) => new Request("http://localhost/api/admin/campaigns", { method: "POST", body: JSON.stringify(data) });
const params = { params: Promise.resolve({ id: "campaign" }) };
beforeEach(() => {
  vi.clearAllMocks(); mock.role = "super_admin";
  mock.vendor.mockResolvedValue({ id: "vendor" }); mock.service.mockResolvedValue({ id: "service" });
  mock.find.mockResolvedValue({ ...body, id: "campaign", startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt) });
  mock.create.mockResolvedValue({ ...body, id: "campaign" }); mock.update.mockResolvedValue({ ...body, id: "campaign" });
});
describe("admin sponsored campaign management", () => {
  it("creates a scheduled placement and refreshes the homepage", async () => {
    expect((await POST(req(body))).status).toBe(200);
    expect(mock.create.mock.calls[0][0].data.startsAt.toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect(mock.audit).toHaveBeenCalled(); expect(mock.invalidate).toHaveBeenCalledWith("home-catalog");
  });
  it.each(["analyst", "customer", "vendor_owner"])("prevents %s from buying admin privileges", async role => {
    mock.role = role;
    expect((await POST(req(body))).status).toBe(403); expect(mock.create).not.toHaveBeenCalled();
    expect((await DELETE(req({}), params)).status).toBe(403); expect(mock.remove).not.toHaveBeenCalled();
  });
  it("allows marketing staff to manage paid placements", async () => { mock.role = "marketing_manager"; expect((await POST(req(body))).status).toBe(200); });
  it("rejects reversed dates and invalid placements", async () => {
    expect((await POST(req({ ...body, endsAt: body.startsAt }))).status).toBe(400);
    expect((await POST(req({ ...body, placement: "invented" }))).status).toBe(400); expect(mock.create).not.toHaveBeenCalled();
  });
  it("rejects a service owned by another vendor", async () => {
    mock.service.mockResolvedValue(null); expect((await POST(req(body))).status).toBe(400); expect(mock.create).not.toHaveBeenCalled();
    expect(mock.service.mock.calls[0][0].where).toEqual({ id: "service", vendorId: "vendor" });
  });
  it("validates the existing service when the vendor changes", async () => { mock.service.mockResolvedValue(null); expect((await PATCH(req({ vendorId: "other" }), params)).status).toBe(400); expect(mock.update).not.toHaveBeenCalled(); });
  it("pauses an existing campaign and invalidates cached rails", async () => { expect((await PATCH(req({ active: false }), params)).status).toBe(200); expect(mock.update.mock.calls[0][0].data.active).toBe(false); expect(mock.invalidate).toHaveBeenCalledWith("home-catalog"); });
  it("removes only the placement and records its previous data", async () => { expect((await DELETE(req({}), params)).status).toBe(200); expect(mock.remove).toHaveBeenCalledWith({ where: { id: "campaign" } }); expect(mock.audit.mock.calls[0][0].action).toBe("campaign.delete"); });
  it("returns a readable 404 for a removed campaign", async () => { mock.find.mockResolvedValue(null); expect((await PATCH(req({ active: true }), params)).status).toBe(404); expect((await DELETE(req({}), params)).status).toBe(404); });
  it("distinguishes live, scheduled, expired and paused records", () => {
    const now = new Date("2026-11-02T10:00:00Z");
    expect(campaignStatus(body, now)).toBe("Live");
    expect(campaignStatus({ ...body, startsAt: "2026-11-03T10:00:00Z" }, now)).toBe("Scheduled");
    expect(campaignStatus({ ...body, endsAt: now.toISOString() }, now)).toBe("Expired");
    expect(campaignStatus({ ...body, active: false }, now)).toBe("Paused");
  });
  it("exposes the existing hero editor in the admin navigation", () => { expect(visibleAdminScreens("super_admin").some(s => s.id === "hero")).toBe(true); expect(visibleAdminScreens("marketing_manager").some(s => s.id === "hero")).toBe(true); expect(visibleAdminScreens("analyst").some(s => s.id === "hero")).toBe(false); });
  it.each(["javascript:alert(1)", "//evil.example/a", "/\\evil.example/a", "data:image/svg+xml,test"])("rejects unsafe public links: %s", value => { expect(publicContentUrl.safeParse(value).success).toBe(false); });
});
