"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { ALLOWED_IMAGE_TYPES } from "@/lib/galleries";

export function PhotoUploadForm({ galleryId, title, maxBytes, busy, onUpload, onError }: {
  galleryId: string;
  title: string;
  maxBytes: number;
  busy: boolean;
  onUpload: (galleryId: string, form: HTMLFormElement) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return <form className="mt-4 grid gap-2 sm:grid-cols-2" onReset={() => setFile(null)} onSubmit={event => {
    event.preventDefault();
    if (file && !busy) void onUpload(galleryId, event.currentTarget);
  }}>
    <label className="relative flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gold/50 bg-gold/5 px-3 py-2 transition hover:bg-gold/10 focus-within:ring-2 focus-within:ring-gold">
      <input name="file" type="file" aria-label={`Choose photo for ${title}`} accept="image/jpeg,image/png,image/webp,image/gif" required disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={event => {
        const selected = event.currentTarget.files?.[0] ?? null;
        if (selected && !(selected.type ? ALLOWED_IMAGE_TYPES.some(type => type === selected.type) : /\.(jpe?g|png|webp|gif)$/i.test(selected.name))) {
          onError("Choose a JPEG, PNG, WebP, or GIF image.");
          event.currentTarget.value = "";
          setFile(null);
          return;
        }
        if (selected && (!selected.size || selected.size > maxBytes)) {
          onError(!selected.size ? "Choose an image file." : `Each photo must be at most ${Math.round(maxBytes / 1024)} KB.`);
          event.currentTarget.value = "";
          setFile(null);
          return;
        }
        setFile(selected);
        onError("");
      }} />
      <ImagePlus className="h-5 w-5 shrink-0 text-goldink" aria-hidden />
      <span className="min-w-0"><span className="block text-sm font-semibold">Choose photo</span><span className="block truncate text-xs text-ink2">{file?.name || "Select from your phone or computer"}</span></span>
    </label>
    <input name="therapistName" aria-label="Therapist name" placeholder="Therapist name" disabled={busy} className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base" />
    <input name="caption" aria-label="Caption" placeholder="Caption" disabled={busy} className="min-h-12 rounded-xl border border-line bg-elev px-3 text-base sm:col-span-2" />
    <button type="submit" disabled={!file || busy} aria-busy={busy} className="min-h-12 rounded-full bg-gold px-4 font-bold text-ongold disabled:cursor-not-allowed disabled:bg-elev disabled:text-ink2 disabled:opacity-60 sm:col-span-2">
      {busy ? "Uploading…" : "Upload photo"}
    </button>
  </form>;
}
