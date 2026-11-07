import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ image: vi.fn(), gallery: vi.fn(), count: vi.fn(), remove: vi.fn(), file: vi.fn() }));
vi.mock("../src/lib/vendor-auth", () => ({ requireVendor: async () => ({ vendorId: "owned" }) }));
vi.mock("../src/lib/db", () => ({ prisma: {
  therapistGalleryImage: { findFirst: mock.image, delete: mock.remove },
  therapistGallery: { findFirst: mock.gallery, delete: mock.remove },
  vendor: { count: mock.count }, service: { count: async () => 0 }
} }));
vi.mock("../src/lib/gallery-media", () => ({ deleteGalleryImageFile: mock.file }));
import { DELETE as imageDelete } from "../src/app/api/vendor/galleries/images/route";
import { DELETE as albumDelete } from "../src/app/api/vendor/galleries/route";
beforeEach(() => { vi.clearAllMocks(); mock.image.mockResolvedValue({ id: "photo", url: "/owned.png" }); mock.gallery.mockResolvedValue({ id: "album", title: "Therapist", images: [{ url: "/owned.png" }] }); mock.count.mockResolvedValue(1); });
it("blocks deleting a current business cover or logo before removing its file", async () => {
  const result = await imageDelete(new Request("http://localhost/api/vendor/galleries/images?id=photo", { method: "DELETE" }));
  expect(result.status).toBe(409); expect(mock.file).not.toHaveBeenCalled(); expect(mock.remove).not.toHaveBeenCalled();
  expect(mock.image.mock.calls[0][0].where).toEqual({ id: "photo", gallery: { vendorId: "owned" } });
});
it("blocks deleting an album containing a current business cover or logo", async () => {
  expect((await albumDelete(new Request("http://localhost/api/vendor/galleries?id=album", { method: "DELETE" }))).status).toBe(409);
  expect(mock.file).not.toHaveBeenCalled(); expect(mock.remove).not.toHaveBeenCalled();
});
it("still removes an unused owned photo", async () => {
  mock.count.mockResolvedValue(0);
  expect((await imageDelete(new Request("http://localhost/api/vendor/galleries/images?id=photo", { method: "DELETE" }))).status).toBe(200);
  expect(mock.file).toHaveBeenCalledWith("/owned.png");
  expect(mock.remove).toHaveBeenCalledWith({ where: { id: "photo" } });
});
