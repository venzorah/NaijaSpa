import { isProfileGalleryTitle } from "./galleries";

/** Reuse the existing owned-gallery upload flow, including configured quotas. */
export async function uploadBusinessPhoto(file: File, target: "cover" | "logo") {
  const response = await fetch("/api/vendor/galleries");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load your photos. Please try again.");
  if (!file.size) throw new Error("Choose an image file.");
  const maxBytes = data.config?.maxImageBytes ?? 2 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`Each photo must be at most ${Math.round(maxBytes / 1024)} KB.`);
  const gallery = data.galleries?.find((item: { title: string }) => isProfileGalleryTitle(item.title));
  if (!gallery) throw new Error("Could not find your profile photos. Please try again.");
  const form = new FormData(); form.set("galleryId", gallery.id); form.set("file", file);
  const uploaded = await fetch("/api/vendor/galleries/images", { method: "POST", body: form });
  const result = await uploaded.json();
  if (!uploaded.ok) throw new Error(result.error || "Could not upload photo.");
  const updated = await fetch("/api/vendor/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageId: result.image.id, target })
  });
  if (!updated.ok) throw new Error("Photo uploaded, but the profile image could not be updated. Choose it from your existing photos or try again.");
}
