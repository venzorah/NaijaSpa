"use client";

import { useRef } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, Clock, Heart, MapPin, Star } from "lucide-react";
import { formatNgn } from "@/lib/money";
import type { HomeCard } from "@/lib/home-types";
import { useAutoScroll } from "@/hooks/use-auto-scroll";

export function ServiceCarousel({
  id,
  title,
  subtitle,
  seeAllHref,
  cards,
  accent = "gold"
}: {
  id: string;
  title: string;
  subtitle?: string;
  seeAllHref: string;
  cards: HomeCard[];
  accent?: "gold" | "leaf";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const auto = useAutoScroll(scroller, 4000);
  if (cards.length === 0) return null;

  const scrollByDir = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby={id}
      className="mx-auto mt-10 max-w-7xl"
      onMouseEnter={auto.pause}
      onMouseLeave={auto.resume}
      onFocusCapture={auto.pause}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) auto.resume();
      }}
    >
      <div className="flex items-end justify-between gap-3 px-4 lg:px-8">
        <div>
          <h2 id={id} className="font-display text-2xl md:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 max-w-xl text-sm text-ink2">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={seeAllHref} className="hidden text-sm font-semibold text-goldink sm:inline">
            Browse all →
          </Link>
          <button
            type="button"
            aria-label={`Previous ${title}`}
            onClick={() => scrollByDir(-1)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Next ${title}`}
            onClick={() => scrollByDir(1)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:px-8"
      >
        {cards.map((card) => (
          <ServiceFeedCard key={`${id}-${card.service.id}`} card={card} />
        ))}
      </div>
      <div className="mt-2 px-4 sm:hidden lg:px-8">
        <Link href={seeAllHref} className="text-sm font-semibold text-goldink">
          Browse all {title.toLowerCase()} →
        </Link>
      </div>
    </section>
  );
}

function ServiceFeedCard({ card }: { card: HomeCard }) {
  const { service, vendor, badge, tags = [], nextLabel, compareAtKobo } = card;
  const verified = vendor.verificationStatus === "verified";
  const vip = badge === "Premium" || badge === "Featured";
  const cover = service.imageUrl || "/brand/icon-green.png";
  const photo = vendor.logoUrl && !vendor.logoUrl.includes("icon-white") ? vendor.logoUrl : cover;

  return (
    <article className="flex w-[18.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-[1.35rem] border border-line bg-card shadow-sm sm:w-[19.5rem]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="h-40 w-full object-cover" />
      <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug">{vendor.businessName}</h3>
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-ink2" aria-hidden />
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink2">{service.name}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {typeof vendor.ratingAvg === "number" && vendor.ratingAvg > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
            {vendor.ratingAvg.toFixed(1)}
            {vendor.reviewCount ? <span className="font-normal text-ink2">({vendor.reviewCount})</span> : null}
          </span>
        )}
        {verified && (
          <span className="inline-flex items-center gap-1 text-ink2">
            <BadgeCheck className="h-3.5 w-3.5 text-leaf" aria-hidden />
            Verified
          </span>
        )}
      </div>

      {vip && (
        <span className="mt-3 inline-flex w-fit rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-goldink">
          VIP
        </span>
      )}

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full bg-elev px-2.5 py-1 text-[11px] text-ink2">
              {tag}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink2">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {[vendor.neighbourhood, vendor.city].filter(Boolean).join(", ")}
      </p>
      {nextLabel && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink2">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {nextLabel}
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="text-lg font-bold leading-none">
          {compareAtKobo != null && compareAtKobo > service.basePriceKobo && (
            <span className="mr-1 text-xs font-normal text-ink2 line-through">{formatNgn(compareAtKobo)}</span>
          )}
          {formatNgn(service.basePriceKobo)}
          <span className="ml-1 text-xs font-normal text-ink2">/ {service.durationMin} min</span>
        </p>
        <Link
          href={`/services/${service.slug}`}
          className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-bg"
        >
          View & book
        </Link>
      </div>
      </div>
    </article>
  );
}

export function VendorCarousel({
  title,
  vendors
}: {
  title: string;
  vendors: Array<{
    slug: string;
    businessName: string;
    city: string;
    neighbourhood: string;
    coverUrl?: string | null;
    ratingAvg: number;
  }>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const auto = useAutoScroll(scroller, 4800);
  if (vendors.length === 0) return null;
  return (
    <section
      className="mx-auto mt-10 max-w-7xl"
      onMouseEnter={auto.pause}
      onMouseLeave={auto.resume}
    >
      <div className="px-4 lg:px-8">
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      </div>
      <div
        ref={scroller}
        className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:px-8"
      >
        {vendors.map((v) => (
          <Link
            key={v.slug}
            href={`/providers/${v.slug}`}
            className="w-[16.75rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-line bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.coverUrl || "/brand/icon-green.png"} alt="" className="h-32 w-full object-cover" />
            <div className="p-4">
              <h3 className="font-semibold">{v.businessName}</h3>
              <p className="mt-1 text-sm text-ink2">
                {v.neighbourhood}, {v.city}
                {v.ratingAvg ? ` · ${v.ratingAvg.toFixed(1)}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
