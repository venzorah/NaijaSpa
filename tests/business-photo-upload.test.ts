import { afterEach, expect, it, vi } from "vitest";
import { uploadBusinessPhoto } from "../src/lib/business-photo-upload";
afterEach(() => vi.unstubAllGlobals());
const file = () => new File([new Uint8Array(16)], "photo.png", { type: "image/png" });
function responses(...values: Array<[number, unknown]>) {
  const fetcher = vi.fn();
  for (const [status, value] of values) fetcher.mockResolvedValueOnce(Response.json(value, { status }));
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
const album = { galleries: [{ id: "owned-profile", title: "Profile photos" }], config: { maxImageBytes: 1024 } };
it("uploads from the device into the owned profile album and sets only the chosen cover", async () => {
  const fetcher = responses([200, album], [200, { image: { id: "new-photo" } }], [200, { ok: true }]);
  await uploadBusinessPhoto(file(), "cover");
  const data = fetcher.mock.calls[1][1].body as FormData;
  expect(data.get("galleryId")).toBe("owned-profile");
  expect(data.get("file")).toBeInstanceOf(File);
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ imageId: "new-photo", target: "cover" });
});
it("supports a direct logo upload with the same existing ownership checks", async () => {
  const fetcher = responses([200, album], [200, { image: { id: "logo-photo" } }], [200, { ok: true }]);
  await uploadBusinessPhoto(file(), "logo");
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ imageId: "logo-photo", target: "logo" });
});
it("rejects an oversized photo before uploading or changing the profile", async () => {
  const fetcher = responses([200, { ...album, config: { maxImageBytes: 1 } }]);
  await expect(uploadBusinessPhoto(file(), "cover")).rejects.toThrow("at most");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not change the profile after an upload or quota failure", async () => {
  const fetcher = responses([200, album], [400, { error: "Photo limit reached" }]);
  await expect(uploadBusinessPhoto(file(), "cover")).rejects.toThrow("Photo limit reached");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("keeps a successful upload available if assigning it to the profile fails", async () => {
  const fetcher = responses([200, album], [200, { image: { id: "new-photo" } }], [500, {}]);
  await expect(uploadBusinessPhoto(file(), "cover")).rejects.toThrow("Choose it from your existing photos");
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls.some(call => call[1]?.method === "DELETE")).toBe(false);
});
