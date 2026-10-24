"use client";

import { useEffect, useState } from "react";
import { isProfileGalleryTitle, PROFILE_GALLERY_MAX_IMAGES } from "@/lib/galleries";
import { VendorPageHeader } from "@/components/vendor/page-header";

type ImageRow = { id: string; url: string; caption: string; therapistName: string };
type GalleryRow = { id: string; title: string; caption: string; images: ImageRow[] };
type VideoRow = { id: string; url: string; title: string };

export default function VendorGalleriesPage() {
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [videoLinks, setVideoLinks] = useState<VideoRow[]>([]);
  const [maxGalleries, setMaxGalleries] = useState(7);
  const [maxImages, setMaxImages] = useState(10);
  const [profileMax, setProfileMax] = useState(PROFILE_GALLERY_MAX_IMAGES);
  const [maxBytes, setMaxBytes] = useState(2 * 1024 * 1024);
  const [videosOk, setVideosOk] = useState(false);
  const [planCode, setPlanCode] = useState("FREE");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const load = () => {
    fetch("/api/vendor/galleries")
      .then((r) => r.json())
      .then((j) => {
        setGalleries(j.galleries || []);
        setVideoLinks(j.videoLinks || []);
        setMaxGalleries(j.config?.maxGalleries ?? 7);
        setMaxImages(j.config?.maxImagesPerGallery ?? 10);
        setProfileMax(j.config?.profileMaxImages ?? PROFILE_GALLERY_MAX_IMAGES);
        setMaxBytes(j.config?.maxImageBytes ?? 2 * 1024 * 1024);
        setVideosOk(Boolean(j.videoLinksAllowed));
        setPlanCode(j.planCode || "FREE");
      });
  };

  useEffect(() => {
    load();
  }, []);

  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/vendor/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, caption })
    });
    const j = await res.json();
    if (!res.ok) {
      setMessage(j.error || "Could not create gallery.");
      return;
    }
    setTitle("");
    setCaption("");
    setMessage("Gallery created.");
    load();
  };

  const removeGallery = async (id: string) => {
    if (!confirm("Delete this gallery and its photos?")) return;
    const res = await fetch(`/api/vendor/galleries?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) setMessage("Could not delete gallery.");
    load();
  };

  const uploadImage = async (galleryId: string, form: HTMLFormElement) => {
    setMessage("");
    const fd = new FormData(form);
    fd.set("galleryId", galleryId);
    const file = fd.get("file");
    if (file instanceof File && file.size > maxBytes) {
      setMessage(`Each image must be at most ${Math.round(maxBytes / 1024)} KB.`);
      return;
    }
    const res = await fetch("/api/vendor/galleries/images", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) {
      setMessage(j.error || "Upload failed.");
      return;
    }
    form.reset();
    setMessage("Photo added.");
    load();
  };

  const addImageUrl = async (galleryId: string, url: string, therapistName: string, imageCaption: string) => {
    setMessage("");
    const res = await fetch("/api/vendor/galleries/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ galleryId, url, therapistName, caption: imageCaption })
    });
    const j = await res.json();
    if (!res.ok) {
      setMessage(j.error || "Could not add image link.");
      return;
    }
    setMessage("Photo added.");
    load();
  };

  const removeImage = async (id: string) => {
    await fetch(`/api/vendor/galleries/images?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/vendor/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl, title: videoTitle })
    });
    const j = await res.json();
    if (!res.ok) {
      setMessage(j.error || "Could not add video link.");
      return;
    }
    setVideoUrl("");
    setVideoTitle("");
    setMessage("Video link added.");
    load();
  };

  const removeVideo = async (id: string) => {
    const res = await fetch(`/api/vendor/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(j.error || "Could not remove video link.");
    load();
  };

  const profileGallery = galleries.find((g) => isProfileGalleryTitle(g.title));
  const namedGalleries = galleries.filter((g) => !isProfileGalleryTitle(g.title));

  const renderGallery = (g: GalleryRow, limit: number, canDelete: boolean) => (
    <li key={g.id} className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{g.title}</p>
          {g.caption ? <p className="text-xs text-ink2">{g.caption}</p> : null}
          <p className="text-xs text-ink2">
            {g.images.length}/{limit} photos · {Math.round(maxBytes / 1024)} KB max
          </p>
        </div>
        {canDelete ? (
          <button type="button" onClick={() => removeGallery(g.id)} className="text-xs font-semibold text-ink2">
            Delete
          </button>
        ) : null}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {g.images.map((img) => (
          <li key={img.id} className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.therapistName || img.caption} className="h-28 w-full object-cover" />
            <p className="px-2 py-1 text-[11px] text-ink2">{img.therapistName || img.caption || "Photo"}</p>
            <button type="button" className="px-2 pb-2 text-[11px]" onClick={() => removeImage(img.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      {g.images.length < limit ? (
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            uploadImage(g.id, e.currentTarget);
          }}
        >
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className="text-base" />
          <input name="therapistName" placeholder="Therapist name" className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base" />
          <input name="caption" placeholder="Caption" className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base" />
          <button type="submit" className="min-h-12 rounded-full bg-gold px-4 font-bold text-ongold">
            Upload photo
          </button>
        </form>
      ) : null}
      {g.images.length < limit ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addImageUrl(
              g.id,
              String(fd.get("url") || ""),
              String(fd.get("therapistName") || ""),
              String(fd.get("caption") || "")
            );
            e.currentTarget.reset();
          }}
        >
          <input name="url" placeholder="https image URL (optional)" className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base sm:col-span-2" />
          <input name="therapistName" placeholder="Therapist name" className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base" />
          <input name="caption" placeholder="Caption" className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base" />
          <button type="submit" className="min-h-12 rounded-full border border-line px-4 text-sm font-semibold">
            Add image URL
          </button>
        </form>
      ) : null}
    </li>
  );

  return (
    <div>
      <VendorPageHeader
        title="Galleries"
        description={`Profile photos show as a two-up swipe gallery on your public listing (up to ${profileMax} images, ${Math.round(maxBytes / 1024)} KB each). Add up to ${maxGalleries} named therapist galleries (${maxImages} photos each). Video links are for paid plans only.`}
      />
      {message ? <p className="mt-3 text-sm font-medium text-forest">{message}</p> : null}

      <form onSubmit={createGallery} className="mt-6 grid max-w-xl gap-3 rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold">
          New therapist gallery ({namedGalleries.length}/{maxGalleries})
        </p>
        <label className="text-sm">
          Name
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-elev px-3"
          />
        </label>
        <label className="text-sm">
          Caption
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-elev px-3"
          />
        </label>
        <button
          type="submit"
          disabled={namedGalleries.length >= maxGalleries}
          className="min-h-11 rounded-full bg-gold px-5 font-bold text-ongold disabled:opacity-50"
        >
          Add gallery
        </button>
      </form>

      {profileGallery ? (
        <ul className="mt-6 space-y-4">{renderGallery(profileGallery, profileMax, false)}</ul>
      ) : null}

      <ul className="mt-6 space-y-4">{namedGalleries.map((g) => renderGallery(g, maxImages, true))}</ul>

      <section className="mt-10 max-w-xl rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Video links</h2>
        {videosOk ? (
          <>
            <p className="mt-1 text-xs text-ink2">YouTube, Vimeo, or a direct https video URL. Plan {planCode}.</p>
            <form onSubmit={addVideo} className="mt-4 grid gap-3">
              <input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Title"
                className="min-h-11 rounded-xl border border-line bg-elev px-3"
              />
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/..."
                required
                className="min-h-11 rounded-xl border border-line bg-elev px-3"
              />
              <button type="submit" className="min-h-11 rounded-full bg-gold font-bold text-ongold">
                Add video link
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {videoLinks.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <a href={v.url} className="truncate underline" target="_blank" rel="noreferrer">
                    {v.title || v.url}
                  </a>
                  <button type="button" onClick={() => removeVideo(v.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink2">
            Video links are a paid-plan benefit. Upgrade under Subscriptions to add YouTube, Vimeo, or direct video URLs.
            Existing links stay hidden on your public profile while you are on the free plan.
          </p>
        )}
      </section>
    </div>
  );
}
