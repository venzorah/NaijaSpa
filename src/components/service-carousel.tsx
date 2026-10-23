"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
            See all
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
          <ServiceTile key={`${id}-${card.service.id}`} card={card} accent={accent} />
        ))}
      </div>
      <div className="mt-2 px-4 sm:hidden lg:px-8">
        <Link href={seeAllHref} className="text-sm font-semibold text-goldink">
          See all {title.toLowerCase()} →
        </Link>
      </div>
    </section>
  );
}

function ServiceTile({ card, accent }: { card: HomeCard; accent: "gold" | "leaf" }) {
  const { service, vendor, badge, sponsored, compareAtKobo } = card;
  const badgeLabel = badge || (sponsored ? "Sponsored" : null);
  return (
    <Link
      href={`/services/${service.slug}`}
      className="w-[16.75rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-line bg-card sm:w-[18.5rem]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={service.imageUrl || "/brand/icon-green.png"} alt="" className="h-40 w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-xs text-ink2">
            {vendor.businessName}
            {vendor.neighbourhood ? ` · ${vendor.neighbourhood}` : ""}
          </p>
          {badgeLabel && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                accent === "leaf" ? "bg-leaf/15 text-leaf" : "bg-gold/20 text-goldink"
              }`}
            >
              {badgeLabel}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{service.name}</h3>
        <p className="mt-1 text-sm text-goldink">
          {compareAtKobo != null && compareAtKobo > service.basePriceKobo && (
            <span className="mr-1 text-ink2 line-through">{formatNgn(compareAtKobo)}</span>
          )}
          from {formatNgn(service.basePriceKobo)} · {service.durationMin} min
        </p>
        {typeof vendor.ratingAvg === "number" && vendor.ratingAvg > 0 && (
          <p className="mt-1 text-xs text-ink2">
            {vendor.ratingAvg.toFixed(1)}
            {vendor.reviewCount ? ` · ${vendor.reviewCount} reviews` : ""}
          </p>
        )}
      </div>
    </Link>
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
