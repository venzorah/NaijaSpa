"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SearchFiltersForm } from "@/components/search-filters-form";
import { exploreHref, FILTER_QUERY_KEYS, type FilterQuery } from "@/lib/place-urls";
import { HERO_AD_INTERVAL_MS, type HomeHeroAd, type HomeHeroBanner } from "@/lib/home-hero";
import { PHOTOS } from "@/lib/photos";
import type { LivePlace } from "@/lib/nigeria";

const HERO_INTERVAL_MS = 7000;

const EXTRA_SLIDES = [
  {
    id: "sensual",
    offer: "Sensual oil hour",
    title: "Heat, silk gel, quiet hands",
    subtitle: "",
    price: "Starting from ₦38,000",
    cta: "Book now",
    category: "massage",
    image: PHOTOS.hero2
  },
  {
    id: "couples",
    offer: "For two",
    title: "A shared oil ritual",
    subtitle: "",
    price: "Starting from ₦72,000",
    cta: "See couples",
    category: "couples",
    image: PHOTOS.hero3
  }
] as const;

type Category = { slug: string; name: string };

function placeAwareHref(href: string, place: LivePlace | null) {
  if (!href.startsWith("/explore")) return href;
  const queryIndex = href.indexOf("?");
  const params = new URLSearchParams(queryIndex >= 0 ? href.slice(queryIndex + 1) : "");
  const query: FilterQuery = {};
  for (const key of FILTER_QUERY_KEYS) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return exploreHref(place, query);
}

function PremiumAdCarousel({ ads }: { ads: HomeHeroAd[] }) {
  const [index, setIndex] = useState(0);
  const [manual, setManual] = useState(false);
  const ad = ads[index] ?? ads[0];

  const go = useCallback(
    (dir: -1 | 1, fromUser = false) => {
      if (fromUser) setManual(true);
      setIndex((i) => (i + dir + ads.length) % ads.length);
    },
    [ads.length]
  );

  const pick = (i: number) => {
    setManual(true);
    setIndex(i);
  };

  useEffect(() => {
    if (manual || ads.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), HERO_AD_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [manual, ads.length, go, index]);

  if (!ad) return null;

  return (
    <aside
      className="relative order-2 h-[22rem] overflow-hidden rounded-3xl border border-line bg-card text-ink lg:order-3 md:h-[26rem]"
      aria-roledescription="carousel"
      aria-label="Premium vendor ads"
    >
      {ads.map((item, i) => (
        <div
          key={item.id}
          className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${i === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="h-36 w-full object-cover md:h-40" />
          <div className="flex flex-1 flex-col p-5 pb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Premium vendor</p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">{item.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink2">{item.body}</p>
            <Link
              href={item.ctaHref}
              className="mt-auto inline-flex w-fit min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
            >
              {item.ctaLabel} →
            </Link>
          </div>
        </div>
      ))}

      {ads.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-between px-3">
          <button
            type="button"
            aria-label="Previous ad"
            onClick={() => go(-1, true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card/90 text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Premium ads">
            {ads.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.title}
                onClick={() => pick(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-gold" : "w-2 bg-ink/25"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next ad"
            onClick={() => go(1, true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card/90 text-ink"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export function HeroSlider({
  greeting,
  categories = [],
  place = null,
  banner,
  ads = []
}: {
  greeting: string;
  categories?: Category[];
  place?: LivePlace | null;
  banner: HomeHeroBanner;
  ads?: HomeHeroAd[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const navCats = categories.slice(0, 8);
  const slides = [
    {
      id: "featured",
      offer: banner.kicker,
      title: banner.title,
      subtitle: banner.subtitle,
      price: banner.priceLine,
      cta: banner.ctaLabel,
      href: placeAwareHref(banner.ctaHref, place),
      image: banner.imageUrl
    },
    ...EXTRA_SLIDES.map((s) => ({
      ...s,
      href: exploreHref(place, { category: s.category })
    }))
  ];
  const slide = slides[index] ?? slides[0];

  const goHero = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => goHero(1), HERO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, goHero, index]);

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-2 pt-5 lg:px-8">
      <p className="mb-4 text-sm text-ink2">{greeting}</p>
      <div
        className={`grid items-stretch gap-4 ${
          ads.length
            ? "lg:grid-cols-[220px_minmax(0,1fr)_240px] xl:grid-cols-[240px_minmax(0,1fr)_260px]"
            : "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]"
        }`}
      >
        <nav
          aria-label="Categories"
          className="hidden rounded-3xl border border-line bg-card p-3 lg:order-1 lg:flex lg:flex-col"
        >
          {navCats.map((c) => (
            <Link
              key={c.slug}
              href={exploreHref(place, { category: c.slug })}
              className="flex min-h-11 items-center justify-between gap-2 rounded-2xl px-3 text-sm font-medium text-ink hover:bg-elev"
            >
              {c.name}
              <ChevronRight className="h-4 w-4 text-ink2" aria-hidden />
            </Link>
          ))}
          <Link
            href={exploreHref(place)}
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/15" />
            </div>
          ))}
          <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{slide.offer}</p>
            <h1 className="mt-2 max-w-lg font-display text-xl font-semibold leading-snug">{slide.title}</h1>
            {slide.subtitle ? <p className="mt-3 max-w-md text-sm text-white/85">{slide.subtitle}</p> : null}
            {slide.price ? <p className="mt-2 text-sm font-semibold text-gold">{slide.price}</p> : null}
            <Link
              href={slide.href}
              className="mt-6 inline-flex w-fit min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold"
            >
              {slide.cta} →
            </Link>
            <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Hero slides">
              {slides.map((s, i) => (
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

        {ads.length ? (
          <PremiumAdCarousel ads={ads.map((ad) => ({ ...ad, ctaHref: placeAwareHref(ad.ctaHref, place) }))} />
        ) : null}
      </div>

      <SearchFiltersForm
        values={
          place
            ? { state: place.state, city: place.city, neighbourhood: place.neighbourhood }
            : undefined
        }
      />
    </section>
  );
}
