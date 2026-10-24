"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";

export type ProfileGalleryImage = {
  id: string;
  url: string;
  caption: string;
  therapistName: string;
};

export function VendorProfileGallery({
  images,
  heading = "Gallery"
}: {
  images: ProfileGalleryImage[];
  heading?: string;
}) {
  const slides = images.slice(0, 6);
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState<number | null>(null);

  const go = useCallback(
    (next: number) => {
      if (!slides.length) return;
      const i = ((next % slides.length) + slides.length) % slides.length;
      setIndex(i);
      const el = scroller.current;
      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    },
    [slides.length]
  );

  useEffect(() => {
    if (full == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(null);
      if (e.key === "ArrowRight") setFull((n) => ((n ?? 0) + 1) % slides.length);
      if (e.key === "ArrowLeft") setFull((n) => ((n ?? 0) - 1 + slides.length) % slides.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, slides.length]);

  if (!slides.length) return null;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIndex(Math.min(slides.length - 1, Math.max(0, i)));
  };

  const fullImage = full != null ? slides[full] : null;

  return (
    <section className={heading ? "mt-6" : ""}>
      {heading ? (
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">{heading}</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink2">
            Swipe · {index + 1}/{slides.length}
          </p>
        </div>
      ) : null}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-card">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {slides.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setFull(i)}
              className="relative h-56 w-full min-w-full shrink-0 snap-center sm:h-80"
              aria-label={`View photo ${i + 1} of ${slides.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicWellnessPhoto(img.url, PHOTOS.spa)}
                alt={img.therapistName || img.caption || `Gallery photo ${i + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white sm:flex"
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white sm:flex"
              onClick={() => go(index + 1)}
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  aria-label={`Show photo ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full ${i === index ? "w-6 bg-gold" : "w-1.5 bg-white/70"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {fullImage && full != null ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/92 pt-safe" role="dialog" aria-modal="true" aria-label="Full gallery">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">
              {full + 1} / {slides.length}
            </p>
            <button type="button" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold" onClick={() => setFull(null)}>
              Close
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center overflow-hidden"
            onPointerDown={(e) => {
              (e.currentTarget as HTMLDivElement & { _x?: number })._x = e.clientX;
            }}
            onPointerUp={(e) => {
              const start = (e.currentTarget as HTMLDivElement & { _x?: number })._x;
              if (start == null) return;
              const dx = e.clientX - start;
              if (Math.abs(dx) < 40) return;
              setFull((n) => ((n ?? 0) + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
            }}
          >
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white"
                  onClick={() => setFull((n) => ((n ?? 0) - 1 + slides.length) % slides.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white"
                  onClick={() => setFull((n) => ((n ?? 0) + 1) % slides.length)}
                >
                  ›
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicWellnessPhoto(fullImage.url, PHOTOS.spa)}
              alt={fullImage.therapistName || fullImage.caption || "Gallery photo"}
              className="mx-auto max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
          {(fullImage.therapistName || fullImage.caption) && (
            <p className="px-4 pb-6 text-center text-sm text-white/80">
              {[fullImage.therapistName, fullImage.caption].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
