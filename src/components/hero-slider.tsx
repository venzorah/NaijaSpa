"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Home, MapPin } from "lucide-react";

const SLIDES = [
  {
    id: "massage",
    offer: "Exclusive offer this week",
    title: "Signature massage, from calm to recovery",
    price: "Starting from ₦18,000",
    cta: "Book now",
    href: "/explore?category=massage",
    image:
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1800&q=80"
  },
  {
    id: "nuru",
    offer: "Nuru silk ritual",
    title: "Warm oil, a slower glide",
    price: "Starting from ₦45,000",
    cta: "Explore Nuru",
    href: "/explore?category=nuru",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1800&q=80"
  },
  {
    id: "couples",
    offer: "For two",
    title: "Couples rituals, one quiet hour",
    price: "Starting from ₦72,000",
    cta: "See couples",
    href: "/explore?category=couples",
    image:
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1800&q=80"
  }
] as const;

const INTERVAL_MS = 7000;

type Category = { slug: string; name: string };

export function HeroSlider({ greeting, categories = [] }: { greeting: string; categories?: Category[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const navCats = categories.slice(0, 8);

  const go = useCallback((dir: -1 | 1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, go, index]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-2 pt-5 lg:px-8">
      <p className="mb-4 text-sm text-ink2">{greeting}</p>
      <div className="grid items-stretch gap-4 lg:grid-cols-[220px_minmax(0,1fr)_220px] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <nav
          aria-label="Categories"
          className="hidden rounded-3xl border border-line bg-card p-3 lg:order-1 lg:flex lg:flex-col"
        >
          {navCats.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="flex min-h-11 items-center justify-between gap-2 rounded-2xl px-3 text-sm font-medium text-ink hover:bg-elev"
            >
              {c.name}
              <ChevronRight className="h-4 w-4 text-ink2" aria-hidden />
            </Link>
          ))}
          <Link
            href="/explore"
            className="mt-auto flex min-h-11 items-center justify-between gap-2 rounded-2xl px-3 text-sm font-semibold text-goldink hover:bg-elev"
          >
            Other categories
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>

        <div
          className="relative order-1 h-[22rem] overflow-hidden rounded-3xl bg-forest text-white md:h-[26rem] lg:order-2"
          aria-roledescription="carousel"
          aria-label="Featured treatments"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {SLIDES.map((s, i) => (
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/15" />
            </div>
          ))}
          <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{slide.offer}</p>
            <h1 className="mt-3 max-w-lg font-display text-4xl font-semibold leading-[1.08] md:text-5xl">{slide.title}</h1>
            <p className="mt-3 text-sm text-white/85">{slide.price}</p>
            <Link
              href={slide.href}
              className="mt-6 inline-flex w-fit min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold"
            >
              {slide.cta} →
            </Link>
            <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Hero slides">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.offer}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-gold" : "w-2.5 bg-white/40"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="order-2 grid gap-4 sm:grid-cols-2 lg:order-3 lg:grid-cols-1">
          <article className="flex flex-col items-center rounded-3xl border border-line bg-card px-5 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-goldink">
              <BadgeCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Verified vendors</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink2">Book ID-checked spas and therapists across Nigeria.</p>
          </article>
          <article className="flex flex-col items-center rounded-3xl border border-line bg-card px-5 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-goldink">
              <Home className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Spa, hotel or home</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink2">
              Choose where you unwind. Hotel and Home add-ons are set by the vendor; Spa/Office has no extra.
            </p>
          </article>
        </div>
      </div>

      <form action="/explore" className="mt-4 flex flex-col gap-2 rounded-3xl border border-line bg-card p-2 sm:flex-row sm:items-center sm:p-2">
        <Link
          href="/explore?city=Lagos"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold"
        >
          <MapPin className="h-4 w-4 text-goldink" />
          Lagos
        </Link>
        <input
          name="q"
          placeholder="Search massage, Nuru, couples…"
          className="min-h-11 flex-1 rounded-2xl bg-elev px-4 text-sm outline-none"
        />
        <input type="hidden" name="city" value="Lagos" />
        <button className="min-h-11 rounded-full bg-gold px-6 text-sm font-bold text-ongold">Search</button>
      </form>
    </section>
  );
}
