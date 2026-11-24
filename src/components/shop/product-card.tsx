"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatNgn } from "@/lib/money";

export function ProductCard({
  href,
  name,
  image,
  gallery = [],
  priceKobo,
  compareKobo,
  vendor,
  category,
  ratingAvg = 0,
  reviewCount = 0,
  sponsored
}: {
  href: string;
  name: string;
  image: string;
  gallery?: string[];
  priceKobo: number;
  compareKobo?: number;
  vendor?: string;
  category?: string;
  ratingAvg?: number;
  reviewCount?: number;
  sponsored?: boolean;
}) {
  const photos = [image, ...gallery].filter(Boolean).slice(0, 3);
  const [active, setActive] = useState(0);
  const shown = photos[active] || image;
  const stars = Math.round(ratingAvg);
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_0_rgba(24,49,39,0.04)] transition hover:border-gold/40 hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative overflow-hidden bg-elev">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="aspect-square h-auto w-full object-cover sm:aspect-[4/5] sm:h-auto" />
          {sponsored ? (
            <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ongold">Sponsored</span>
          ) : null}
        </div>
      </Link>
      {photos.length > 1 ? (
        <div className="flex gap-1.5 px-2 pt-2" role="tablist" aria-label={`${name} photos`}>
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={i === 0 ? "Featured image" : `Gallery image ${i}`}
              onClick={() => setActive(i)}
              className={`h-9 w-9 overflow-hidden rounded-lg border sm:h-11 sm:w-11 ${i === active ? "border-gold" : "border-line"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <Link href={href} className="block p-2.5 sm:p-3.5">
        {category ? <p className="text-[10px] font-bold uppercase tracking-wide text-goldink">{category}</p> : null}
        {vendor ? <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink2">{vendor}</p> : null}
        <h3 className="mt-1 line-clamp-2 min-h-[2.4em] text-sm font-semibold leading-snug">{name}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink2" aria-label={reviewCount ? `${ratingAvg.toFixed(1)} out of 5 from ${reviewCount} reviews` : "No reviews yet"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-3 w-3 ${n <= stars && reviewCount ? "fill-gold text-gold" : "text-line"}`} aria-hidden />
          ))}
          <span>{reviewCount ? `${ratingAvg.toFixed(1)} (${reviewCount})` : "New"}</span>
        </p>
        <p className="mt-1.5 text-[15px] font-bold text-goldink">
          {formatNgn(priceKobo)}
          {compareKobo && compareKobo > priceKobo ? <span className="ml-1.5 text-xs font-normal text-ink2 line-through">{formatNgn(compareKobo)}</span> : null}
        </p>
      </Link>
    </article>
  );
}
