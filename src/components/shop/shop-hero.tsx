"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PHOTOS } from "@/lib/photos";

const INTERVAL_MS = 7000;

export function ShopHero({
  searchHref,
  sellHref,
  servicesHref
}: {
  searchHref: string;
  sellHref: string;
  servicesHref: string;
}) {
  const slides = [
    {
      id: "products",
      kicker: "NaijaSpa Shop",
      title: "Oils, soaps and tools from verified sellers.",
      body: "A specialised beauty and wellness store — not a general marketplace. Book treatments on NaijaSpa; buy products here.",
      image: PHOTOS.bandSpa,
      primary: { href: searchHref, label: "Shop products" },
      secondary: { href: servicesHref, label: "Book a treatment", external: true }
    },
    {
      id: "oils",
      kicker: "Home ritual",
      title: "Botanical oils and body care for after the spa.",
      body: "Stock the same class of oils, butters and soaps your therapist would use — from approved Nigerian sellers.",
      image: PHOTOS.beauty,
      primary: { href: searchHref, label: "Browse products" },
      secondary: { href: sellHref, label: "Sell on Shop", external: false }
    },
    {
      id: "tools",
      kicker: "For sellers",
      title: "List tools, kits and aftercare on NaijaSpa Shop.",
      body: "Product Store is separate from service listing plans. Customers pay once; you dispatch your own orders.",
      image: PHOTOS.spa,
      primary: { href: sellHref, label: "Sell on Shop" },
      secondary: { href: searchHref, label: "See the catalog", external: false }
    }
  ] as const;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[index] ?? slides[0];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, go, index]);

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="NaijaSpa Shop highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image}
            alt=""
            fetchPriority={i === 0 ? "high" : "low"}
            className={`h-full w-full object-cover ${i === index ? "animate-hero-ken" : ""}`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/70 to-forest/30" />
        </div>
      ))}
      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{slide.kicker}</p>
        <h1 className="mt-3 max-w-xl font-display text-4xl text-white md:text-5xl">{slide.title}</h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80">{slide.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={slide.primary.href}
            className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold"
          >
            {slide.primary.label}
          </Link>
          {slide.secondary.external ? (
            <a
              href={slide.secondary.href}
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white"
            >
              {slide.secondary.label}
            </a>
          ) : (
            <Link
              href={slide.secondary.href}
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white"
            >
              {slide.secondary.label}
            </Link>
          )}
        </div>
        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.kicker}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-gold" : "w-2.5 bg-white/40"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
