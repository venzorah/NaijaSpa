"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { SHOP_PUBLIC_URL } from "@/lib/shop-host";
import type { HomeShopProduct } from "@/lib/shop/home-rail";

export function ProductCarousel({
  id,
  title,
  subtitle,
  products,
  seeAllHref = SHOP_PUBLIC_URL
}: {
  id: string;
  title: string;
  subtitle?: string;
  products: HomeShopProduct[];
  seeAllHref?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const auto = useAutoScroll(scroller, 4500);
  if (!products.length) return null;
  const scrollByDir = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 280), behavior: "smooth" });
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
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">NaijaSpa Shop</p>
          <h2 id={id} className="font-display text-2xl md:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 max-w-xl text-sm text-ink2">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={seeAllHref} className="hidden text-sm font-semibold text-goldink sm:inline">
            Open Shop →
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
        className="mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:px-8"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => (
          <div key={p.id} className="w-[11.5rem] shrink-0 snap-start sm:w-[13.5rem]">
            <ProductCard
              href={`${SHOP_PUBLIC_URL}/p/${p.slug}`}
              name={p.name}
              image={p.image}
              gallery={p.gallery}
              priceKobo={p.priceKobo}
              compareKobo={p.compareKobo}
              vendor={p.vendor.businessName}
              category={p.category.name}
              ratingAvg={p.ratingAvg}
              reviewCount={p.reviewCount}
              sponsored={p.sponsored}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
