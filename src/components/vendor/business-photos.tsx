"use client";
import { useToastMessage } from "@/components/vendor/toasts";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { PhotoUploadForm } from "./photo-upload-form";
import { isProfileGalleryTitle, PROFILE_GALLERY_MAX_IMAGES } from "@/lib/galleries";
import { Panel } from "@/components/admin/panel";

type ImageRow = { id: string; url: string; caption: string; therapistName: string };
type GalleryRow = { id: string; title: string; caption: string; images: ImageRow[] };
type VideoRow = { id: string; url: string; title: string };

export function BusinessPhotos({ revision, onChanged }: { revision: string; onChanged: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState("");
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [videoLinks, setVideoLinks] = useState<VideoRow[]>([]);
  const [maxGalleries, setMaxGalleries] = useState(7);
  const [maxImages, setMaxImages] = useState(10);
  const [profileMax, setProfileMax] = useState(PROFILE_GALLERY_MAX_IMAGES);
  const [maxBytes, setMaxBytes] = useState(2 * 1024 * 1024);
  const [videosOk, setVideosOk] = useState(false);
  const [planCode, setPlanCode] = useState("FREE");
  const [message, setMessage, feedbackKind] = useToastMessage();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const load = (refreshProfile = false) => {
    fetch("/api/vendor/galleries")
      .then(async (response) => { if (!response.ok) throw new Error("Could not load galleries. Reload to try again."); return response.json(); })
      .then((j) => {
        setGalleries(j.galleries || []);
        setUploadTarget(current => current || j.galleries?.find((gallery: GalleryRow) => isProfileGalleryTitle(gallery.title))?.id || j.galleries?.[0]?.id || "");
        setVideoLinks(j.videoLinks || []);
        setMaxGalleries(j.config?.maxGalleries ?? 7);
        setMaxImages(j.config?.maxImagesPerGallery ?? 10);
        setProfileMax(j.config?.profileMaxImages ?? PROFILE_GALLERY_MAX_IMAGES);
        setMaxBytes(j.config?.maxImageBytes ?? 2 * 1024 * 1024);
        setVideosOk(Boolean(j.videoLinksAllowed));
        setPlanCode(j.planCode || "FREE");
        if (refreshProfile) onChanged();
      }).catch(error => setMessage(error instanceof Error ? error.message : "Could not load galleries."));
  };

  useEffect(() => {
    load();
  }, [revision]);

  const createGallery = async (e: React.FormEvent) => {try {
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
    setMessage("Gallery created.", "success");
    load(true);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your photos or videos."); }};

  const removeGallery = async (id: string) => {try {
    if (!confirm("Delete this gallery and its photos?")) return;
    const res = await fetch(`/api/vendor/galleries?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) setMessage((await res.json().catch(() => ({}))).error || "Could not delete gallery."); else setMessage("Album deleted.", "success");
    load(true);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your photos or videos."); }};

  const uploadImage = async (galleryId: string, form: HTMLFormElement) => {
    if (uploading) return;
    setMessage("");
    const fd = new FormData(form);
    fd.set("galleryId", galleryId);
    const file = fd.get("file");
    if (!(file instanceof Blob) || !file.size) {
      setMessage("Choose an image file.");
      return;
    }
    if (file.size > maxBytes) {
      setMessage(`Each image must be at most ${Math.round(maxBytes / 1024)} KB.`);
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/vendor/galleries/images", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Upload failed.");
      form.reset();
      setMessage("Photo added.", "success");
      load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (id: string) => {try {
    const response = await fetch(`/api/vendor/galleries/images?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || "Could not remove photo."); else setMessage("Photo deleted.", "success");
    load(true);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your photos or videos."); }};

  const addVideo = async (e: React.FormEvent) => {try {
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
    setMessage("Video link added.", "success");
    load(true);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your photos or videos."); }};

  const removeVideo = async (id: string) => {try {
    const res = await fetch(`/api/vendor/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(j.error || "Could not remove video link."); else setMessage("Video link removed.", "success");
    load(true);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your photos or videos."); }};

  async function quickUpload(files: FileList | null) {
    if (!files?.length || !uploadTarget || uploading) return;
    setUploading(true); setMessage("");
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxBytes) throw new Error(`Each photo must be at most ${Math.round(maxBytes / 1024)} KB.`);
        const form = new FormData(); form.set("galleryId", uploadTarget); form.set("file", file);
        const response = await fetch("/api/vendor/galleries/images", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Photo upload failed.");
        count++;
      }
      setMessage(`${count} photo${count === 1 ? "" : "s"} uploaded.`, "success");
    } catch (error) { setMessage(`${count ? count + " uploaded. " : ""}${error instanceof Error ? error.message : "Upload failed."}`); }
    finally { setUploading(false); if (picker.current) picker.current.value = ""; load(true); }
  }
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
        {g.images.map((img, index) => (
          <li key={img.id} className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.therapistName || img.caption} className="h-28 w-full object-cover" />
            <p className="px-2 py-1 text-[11px] text-ink2">{img.therapistName || img.caption || "Photo"}</p>
            <button type="button" aria-label={`Delete photo ${img.therapistName || img.caption || index + 1}`} title="Delete photo" className="m-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 transition hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-red-400" onClick={() => removeImage(img.id)}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {g.images.length < limit ? <PhotoUploadForm galleryId={g.id} title={g.title} maxBytes={maxBytes} busy={uploading} onUpload={uploadImage} onError={setMessage} /> : null}
    </li>
  );

  return (
    <div id="business-photos" className="scroll-mt-24">
      <Panel title="Business photos" description="Upload directly from your phone or computer. Your existing photos are kept here." actions={<button type="button" disabled={uploading || !uploadTarget} onClick={() => picker.current?.click()} className="inline-flex min-h-10 items-center rounded-lg bg-gold px-4 text-sm font-bold text-ongold disabled:opacity-50">{uploading ? "Uploading…" : "Upload photos"}</button>}>
      <input ref={picker} aria-label="Upload gallery photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => void quickUpload(event.target.files)} />
      <label className="mt-3 flex max-w-md items-center gap-3 text-sm">Upload to<select aria-label="Upload destination gallery" className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2" disabled={uploading} value={uploadTarget} onChange={event => setUploadTarget(event.target.value)}>{galleries.map(gallery => <option key={gallery.id} value={gallery.id}>{gallery.title}</option>)}</select></label>
      {message && feedbackKind === "error" ? <p role="status" className="mt-3 text-sm font-medium text-forest">{message}</p> : null}

      {profileGallery ? (
        <ul className="mt-6 space-y-4">{renderGallery(profileGallery, profileMax, false)}</ul>
      ) : null}

      <details className="mt-5 rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">Therapist albums & video links</summary>
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
      </details>
      </Panel>
    </div>
  );
}
