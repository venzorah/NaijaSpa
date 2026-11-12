"use client";

import { useRef, useState } from "react";
import { ImagePlus, Images, Link2, Plus, Trash2 } from "lucide-react";
import { notifyAction } from "@/lib/action-feedback";
import { adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { EditorModal } from "@/components/admin/editor-modal";
import { AdminMediaLibrary } from "@/components/admin/media-library";
import {
  MAX_ANNOUNCEMENT_IMAGES,
  MAX_ANNOUNCEMENT_LINKS,
  type AnnouncementImage,
  type AnnouncementLink
} from "@/lib/announcement-content";

export function AnnouncementMedia({
  images,
  links,
  disabled,
  onImages,
  onLinks
}: {
  images: AnnouncementImage[];
  links: AnnouncementLink[];
  disabled: boolean;
  onImages: (next: AnnouncementImage[]) => void;
  onLinks: (next: AnnouncementLink[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file || disabled || images.length >= MAX_ANNOUNCEMENT_IMAGES) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Could not upload image.");
      onImages([...images, { src: data.asset.url }]);
      notifyAction("success", "Image attached.");
    } catch (error) {
      notifyAction("error", error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function addFromLibrary(url: string) {
    if (images.some((image) => image.src === url)) {
      notifyAction("info", "That image is already attached.");
      setOpen(false);
      return;
    }
    if (images.length >= MAX_ANNOUNCEMENT_IMAGES) {
      notifyAction("error", `Attach at most ${MAX_ANNOUNCEMENT_IMAGES} images.`);
      setOpen(false);
      return;
    }
    onImages([...images, { src: url }]);
    setOpen(false);
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-3 rounded-xl border border-line p-3">
        <p className="text-sm font-semibold">Images</p>
        <p className="text-xs text-ink2">Upload or pick from the image library. Optional: wrap an image in a link.</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          aria-label="Upload announcement image"
          disabled={disabled || busy}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
        {images.length ? (
          <ul className="grid gap-3">
            {images.map((image, index) => (
              <li key={`${image.src}-${index}`} className="grid gap-2 rounded-xl border border-line bg-elev p-2 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                <img src={image.src} alt="" className="h-24 w-full rounded-lg object-cover sm:h-20" />
                <input
                  className={adminField}
                  placeholder="Optional link, e.g. /explore"
                  maxLength={500}
                  disabled={disabled}
                  value={image.href ?? ""}
                  aria-label={`Link for image ${index + 1}`}
                  onChange={(event) => {
                    const href = event.target.value;
                    onImages(images.map((row, i) => (i === index ? { ...row, href: href || undefined } : row)));
                  }}
                />
                <button
                  type="button"
                  className={adminBtnOutline}
                  disabled={disabled}
                  onClick={() => onImages(images.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink2">No images attached.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={adminBtnOutline}
            disabled={disabled || busy || images.length >= MAX_ANNOUNCEMENT_IMAGES}
            onClick={() => input.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {busy ? "Uploading…" : "Upload image"}
          </button>
          <button
            type="button"
            className={adminBtnOutline}
            disabled={disabled || busy || images.length >= MAX_ANNOUNCEMENT_IMAGES}
            onClick={() => setOpen(true)}
          >
            <Images className="h-4 w-4" />
            Choose from library
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-line p-3">
        <p className="text-sm font-semibold">Extra links</p>
        <p className="text-xs text-ink2">Shown under the gold button. Use a site path like /explore or an https URL.</p>
        {links.length ? (
          <ul className="grid gap-3">
            {links.map((link, index) => (
              <li key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <FormRow label="Label" htmlFor={`ann-link-label-${index}`}>
                  <input
                    id={`ann-link-label-${index}`}
                    className={adminField}
                    maxLength={40}
                    disabled={disabled}
                    value={link.label}
                    onChange={(event) =>
                      onLinks(links.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
                    }
                  />
                </FormRow>
                <FormRow label="URL" htmlFor={`ann-link-href-${index}`}>
                  <input
                    id={`ann-link-href-${index}`}
                    className={adminField}
                    maxLength={500}
                    disabled={disabled}
                    value={link.href}
                    placeholder="https://naijaspa.com/explore"
                    onChange={(event) =>
                      onLinks(links.map((row, i) => (i === index ? { ...row, href: event.target.value } : row)))
                    }
                  />
                </FormRow>
                <button
                  type="button"
                  className={`${adminBtnOutline} sm:mt-6`}
                  disabled={disabled}
                  onClick={() => onLinks(links.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className={adminBtnOutline}
          disabled={disabled || links.length >= MAX_ANNOUNCEMENT_LINKS}
          onClick={() => onLinks([...links, { label: "", href: "" }])}
        >
          {links.length ? <Plus className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          Add link
        </button>
      </div>

      {open ? (
        <EditorModal title="Choose an image" onClose={() => setOpen(false)}>
          <AdminMediaLibrary onSelect={addFromLibrary} />
        </EditorModal>
      ) : null}
    </div>
  );
}
