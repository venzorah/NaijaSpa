import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ update: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock("../src/lib/admin-auth", () => ({ requireAdmin: async () => ({ id: "admin" }) }));
vi.mock("../src/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("../src/lib/category-media", () => ({ saveCategoryImageFile: mock.save, deleteCategoryImageFile: mock.remove }));
vi.mock("../src/lib/db", () => ({ prisma: { category: { findUniqueOrThrow: async () => ({ id: "category", slug: "massage", imageUrl: "/api/media/categories/old.png" }), update: mock.update } } }));
import { PATCH } from "../src/app/api/admin/categories/[id]/route";
const params = { params: Promise.resolve({ id: "category" }) };
function request(bytes = 4) {
  const data = new FormData(); data.set("name", "Updated category"); data.set("slug", "updated-category"); data.set("active", "true"); data.set("imageUrl", "/api/media/categories/old.png"); data.set("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "image.png");
  return new Request("http://localhost/api/admin/categories/category", { method: "PATCH", body: data });
}
beforeEach(() => { vi.clearAllMocks(); mock.remove.mockResolvedValue(undefined); mock.save.mockResolvedValue({ url: "/api/media/categories/new.png", mime: "image/png", storage: "r2" }); mock.update.mockResolvedValue({ id: "category", imageUrl: "/api/media/categories/new.png", active: true }); });
it("saves details, selected image and visibility from the final modal step", async () => { expect((await PATCH(request(), params)).status).toBe(200); expect(mock.update.mock.calls[0][0].data).toMatchObject({ name: "Updated category", imageUrl: "/api/media/categories/new.png", imagePayload: null, active: true }); expect(mock.remove).toHaveBeenCalledWith("/api/media/categories/old.png"); });
it("preserves the previous image if the category update fails", async () => { mock.update.mockRejectedValue({ code: "P2002" }); expect((await PATCH(request(), params)).status).toBe(409); expect(mock.remove).toHaveBeenCalledWith("/api/media/categories/new.png"); expect(mock.remove).not.toHaveBeenCalledWith("/api/media/categories/old.png"); });
it("rejects oversized files before uploading or updating the category", async () => { expect((await PATCH(request(2 * 1024 * 1024 + 1), params)).status).toBe(400); expect(mock.save).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled(); });
it("retains legacy stored image bytes when the image URL is unchanged", async () => { const req = new Request("http://localhost/api/admin/categories/category", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Updated category", imageUrl: "/api/media/categories/old.png" }) }); expect((await PATCH(req, params)).status).toBe(200); expect(mock.update.mock.calls[0][0].data.imagePayload).toBeUndefined(); });
