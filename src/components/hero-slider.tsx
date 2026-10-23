"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const SLIDES = [
  {
    id: "massage",
    kicker: "Signature massage",
    title: "Hands that know the map of you.",
    body: "Swedish, deep tissue and sports recovery with verified therapists — spa, hotel or home.",
    cta: "Explore massage",
    href: "/explore?category=massage",
    image:
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=2000&q=80"
  },
  {
    id: "nuru",
    kicker: "Nuru massage",
    title: "Silk, warmth, a slower glide.",
    body: "A full-body oil ritual: long strokes, heat and gel that lets the nervous system finally drop.",
    cta: "Book Nuru",
    href: "/explore?category=nuru",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=2000&q=80"
  },
  {
    id: "couples",
    kicker: "Couples massage",
    title: "Two tables. One quiet hour.",
    body: "Side-by-side suites for two — shared stillness, separate therapists, one booking.",
    cta: "See couples rituals",
    href: "/explore?category=couples",
    image:
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=2000&q=80"
  }
] as const;

const INTERVAL_MS = 7000;

export function HeroSlider({ greeting }: { greeting: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];

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
    <section
      className="relative isolate overflow-hidden bg-[#06140f] text-white"
      aria-roledescription="carousel"
      aria-label="Featured treatment stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="relative min-h-[34rem] md:min-h-[40rem] lg:min-h-[44rem]">
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image}
              alt=""
              className={`h-full w-full object-cover ${i === index ? "animate-hero-ken" : ""}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06140f] via-[#06140f]/78 to-[#06140f]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06140f] via-transparent to-[#06140f]/35" />
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold/0 via-gold to-gold/0" />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex min-h-[34rem] max-w-7xl flex-col justify-end px-4 pb-28 pt-10 md:min-h-[40rem] md:pb-32 lg:min-h-[44rem] lg:px-8 lg:pb-36">
          <p className="text-sm font-medium text-white/70">{greeting}</p>
          <p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {slide.kicker}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/80 md:text-lg">{slide.body}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={slide.href}
              className="inline-flex min-h-12 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold shadow-[0_12px_40px_rgba(212,175,55,0.28)]"
            >
              {slide.cta}
            </Link>
            <Link
              href="/ai"
              className="inline-flex min-h-12 items-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur"
            >
              Ask NaijaSpa AI
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="ml-1 flex gap-2" role="tablist" aria-label="Hero slides">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.kicker}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 overflow-hidden rounded-full transition-all ${i === index ? "w-10 bg-gold" : "w-3 bg-white/35"}`}
                />
              ))}
            </div>
            <p className="ml-auto hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/50 sm:block">
              {String(index + 1).padStart(2, "0")} / 0{SLIDES.length}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto -mt-16 max-w-7xl px-4 lg:-mt-20 lg:px-8">
        <div className="rounded-[1.75rem] border border-white/10 bg-[#101713]/90 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:bg-card/90">
          <form action="/explore" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/explore?city=Lagos"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/5 px-4 text-sm font-semibold text-white sm:w-auto"
            >
              <MapPin className="h-4 w-4 text-gold" />
              Lagos
            </Link>
            <input
              name="q"
              placeholder="Search massage, Nuru, couples…"
              className="min-h-12 flex-1 rounded-2xl bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/40"
            />
            <input type="hidden" name="city" value="Lagos" />
            <button className="min-h-12 rounded-full bg-gold px-6 text-sm font-bold text-ongold">Search</button>
          </form>
        </div>
      </div>
    </section>
  );
}
