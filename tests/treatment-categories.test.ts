import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ category: vi.fn(), create: vi.fn(), existing: vi.fn(), update: vi.fn() }));
vi.mock("../src/lib/auth", () => ({ getSession: async () => ({ id: "owner", vendorId: "my-vendor" }), requireUser: (user: unknown) => user }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: { category: { findFirst: mock.category }, service: { create: mock.create, findFirst: mock.existing, update: mock.update } } }));
import { POST, PATCH } from "../src/app/api/vendor/services/route";
const req = (body: unknown) => new Request("http://localhost/api/vendor/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); mock.category.mockResolvedValue({ id: "new-category" });
  mock.create.mockImplementation(async ({ data }) => ({ id: "treatment", ...data }));
  mock.update.mockImplementation(async ({ data }) => ({ id: "treatment", ...data }));
  mock.existing.mockResolvedValue({ id: "treatment", vendorId: "my-vendor", categoryId: "old-category" });
});
describe("treatments under shared categories", () => {
  it("creates a specialist's treatment under an active category", async () => {
    const response = await POST(req({ name: "Swedish massage", categoryId: "new-category", basePriceKobo: 1500000, durationMin: 60 }));
    expect(response.status).toBe(200);
    expect((await response.json()).service).toMatchObject({ categoryId: "new-category", vendorId: "my-vendor" });
  });
  it("rejects inactive or missing categories without creating a treatment", async () => {
    mock.category.mockResolvedValue(null);
    const response = await POST(req({ name: "Swedish massage", categoryId: "unavailable", basePriceKobo: 1500000, durationMin: 60 }));
    expect(response.status).toBe(400); expect(mock.create).not.toHaveBeenCalled();
  });
  it("actually saves a category change instead of silently discarding it", async () => {
    const response = await PATCH(req({ id: "treatment", categoryId: "new-category" }));
    expect(response.status).toBe(200);
    expect((await response.json()).service.categoryId).toBe("new-category");
  });
  it("prevents moving a treatment into an unavailable category", async () => {
    mock.category.mockResolvedValue(null);
    expect((await PATCH(req({ id: "treatment", categoryId: "hidden" }))).status).toBe(400);
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("scopes edits to the signed-in specialist", async () => {
    mock.existing.mockResolvedValue(null);
    expect((await PATCH(req({ id: "someone-elses-treatment", categoryId: "new-category" }))).status).toBe(404);
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.existing.mock.calls[0][0].where.vendorId).toBe("my-vendor");
  });
  it("allows retaining a treatment's previous category when that category is later deactivated", async () => {
    const response = await PATCH(req({ id: "treatment", categoryId: "old-category", name: "Updated treatment" }));
    expect(response.status).toBe(200); expect(mock.category).not.toHaveBeenCalled();
  });
});
