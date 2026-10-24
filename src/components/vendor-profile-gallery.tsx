"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";

export type ProfileGalleryImage = {
  id: string;
  url: string;
  caption: string;
  therapistName: string;
};

const PAIR = 2;

export function VendorProfileGallery({
  images,
  heading = "Gallery"
}: {
  images: ProfileGalleryImage[];
  heading?: string;
}) {
  const slides = images.slice(0, 6);
  const pages = Math.max(1, Math.ceil(slides.length / PAIR));
  const [page, setPage] = useState(0);
  const [full, setFull] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);

  const goPage = useCallback(
    (next: number) => {
      setPage(((next % pages) + pages) % pages);
    },
    [pages]
  );

  const goFull = useCallback(
    (next: number) => {
      if (!slides.length) return;
      setFull(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (full == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(null);
      if (e.key === "ArrowRight") goFull(full + 1);
      if (e.key === "ArrowLeft") goFull(full - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, goFull]);

  if (!slides.length) return null;

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    swiped.current = false;
  }
  function onPointerUp(e: React.PointerEvent, mode: "page" | "full") {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 40) return;
    swiped.current = true;
    if (mode === "full" && full != null) goFull(full + (dx < 0 ? 1 : -1));
    else goPage(page + (dx < 0 ? 1 : -1));
  }

  const offset = page * 100;
  const fullImage = full != null ? slides[full] : null;

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        {heading ? <h2 className="font-display text-2xl">{heading}</h2> : <span />}
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink2">
          {slides.length} photo{slides.length === 1 ? "" : "s"}
        </p>
      </div>
      <div
        className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-line bg-card"
        onPointerDown={onPointerDown}
        onPointerUp={(e) => onPointerUp(e, "page")}
      >
        <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${offset}%)` }}>
          {Array.from({ length: pages }, (_, p) => {
            const pair = slides.slice(p * PAIR, p * PAIR + PAIR);
            return (
              <div key={p} className="grid w-full shrink-0 grid-cols-2 gap-1 p-1">
                {pair.map((img, i) => {
                  const index = p * PAIR + i;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        if (swiped.current) {
                          swiped.current = false;
                          return;
                        }
                        setFull(index);
                      }}
                      className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-elev"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicWellnessPhoto(img.url, PHOTOS.spa)}
                        alt={img.therapistName || img.caption || `Gallery photo ${index + 1}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </button>
                  );
                })}
                {pair.length === 1 ? <div className="rounded-[1.35rem] bg-elev/60" /> : null}
              </div>
            );
          })}
        </div>
        {pages > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photos"
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white"
              onClick={() => goPage(page - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photos"
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white"
              onClick={() => goPage(page + 1)}
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show photos ${i * 2 + 1} and ${i * 2 + 2}`}
                  onClick={() => setPage(i)}
                  className={`h-1.5 rounded-full ${i === page ? "w-6 bg-gold" : "w-1.5 bg-white/70"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {fullImage && full != null ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/92 pt-safe"
          onPointerDown={onPointerDown}
          onPointerUp={(e) => onPointerUp(e, "full")}
          role="dialog"
          aria-modal="true"
          aria-label="Full gallery"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">
              {full + 1} / {slides.length}
            </p>
            <button type="button" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold" onClick={() => setFull(null)}>
              Close
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-8">
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white"
                  onClick={() => goFull(full - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white"
                  onClick={() => goFull(full + 1)}
                >
                  ›
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicWellnessPhoto(fullImage.url, PHOTOS.spa)}
              alt={fullImage.therapistName || fullImage.caption || "Gallery photo"}
              className="max-h-full max-w-full object-contain"
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
