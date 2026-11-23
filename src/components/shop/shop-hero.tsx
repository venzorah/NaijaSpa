"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ShopHeroSlideView } from "@/lib/shop/hero";

const INTERVAL_MS = 7000;

export function ShopHero({ slides }: { slides: ShopHeroSlideView[] }) {
  const items = slides.length ? slides : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = items[index] ?? items[0];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, go, index, items.length]);

  if (!slide) return null;

  return (
    <section
      className="relative overflow-hidden bg-[#f6efe4] dark:bg-bg2"
      aria-roledescription="carousel"
      aria-label="NaijaSpa Shop highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-10 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
        <div className="order-2 lg:order-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-goldink">{slide.kicker}</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl text-forest md:text-5xl">{slide.title}</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink2">{slide.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {slide.primary.external ? (
              <a href={slide.primary.href} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
                {slide.primary.label}
              </a>
            ) : (
              <Link href={slide.primary.href} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
                {slide.primary.label}
              </Link>
            )}
            {slide.secondary.external ? (
              <a href={slide.secondary.href} className="inline-flex min-h-11 items-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest">
                {slide.secondary.label}
              </a>
            ) : (
              <Link href={slide.secondary.href} className="inline-flex min-h-11 items-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest">
                {slide.secondary.label}
              </Link>
            )}
          </div>
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-forest"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
              {items.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.kicker}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-gold" : "w-2.5 bg-forest/20"}`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-forest"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="relative order-1 mx-auto flex h-52 w-full max-w-lg items-center justify-center sm:h-72 lg:order-2 lg:h-80">
          {items.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={i !== index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                fetchPriority={i === 0 ? "high" : "low"}
                className="max-h-full max-w-full rounded-2xl object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
