import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock("../src/lib/admin-auth", () => ({ requireAdmin: async () => ({ id: "admin" }) }));
vi.mock("../src/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: { category: { aggregate: async () => ({ _max: { sortOrder: 1 } }), create: mock.create } } }));
vi.mock("../src/lib/category-media", () => ({ saveCategoryImageFile: mock.save, deleteCategoryImageFile: mock.remove }));
import { POST } from "../src/app/api/admin/categories/route";
function request(name = "New category") {
  const data = new FormData(); data.set("name", name); data.set("slug", ""); data.set("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "image.png");
  return new Request("http://localhost/api/admin/categories", { method: "POST", body: data });
}
beforeEach(() => { vi.clearAllMocks(); mock.remove.mockResolvedValue(undefined); mock.save.mockResolvedValue({ url: "/api/media/categories/test.png", mime: "image/png", storage: "r2" }); mock.create.mockImplementation(async ({ data }) => ({ ...data, id: "category" })); });
it("creates a category with its image in one request", async () => { const res = await POST(request()); expect(res.status).toBe(200); const { category } = await res.json(); expect(category.imageUrl).toBe("/api/media/categories/test.png"); expect(category.slug).toBe("new-category"); expect(category).not.toHaveProperty("imagePayload"); expect(category.active).toBe(false); });
it("validates category details before uploading a file", async () => { expect((await POST(request("x"))).status).toBe(400); expect(mock.save).not.toHaveBeenCalled(); expect(mock.create).not.toHaveBeenCalled(); });
it("cleans up the image if the category slug collides", async () => { mock.create.mockRejectedValue({ code: "P2002" }); expect((await POST(request())).status).toBe(409); expect(mock.remove).toHaveBeenCalledWith("/api/media/categories/test.png"); });
it("does not create a category when its image upload fails", async () => { mock.save.mockRejectedValue(new Error("Upload unavailable")); expect((await POST(request())).status).toBe(400); expect(mock.create).not.toHaveBeenCalled(); });
