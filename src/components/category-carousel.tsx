"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryImage } from "@/lib/category-images";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import type { LivePlace } from "@/lib/nigeria";

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl?: string | null;
};

export function CategoryCarousel({
  categories,
  place = null
}: {
  categories: CategoryTile[];
  place?: LivePlace | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const auto = useAutoScroll(scroller, 3600);
  if (categories.length === 0) return null;

  const scrollByDir = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.55, 220), behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="shop-by-category"
      className="mx-auto mt-6 max-w-7xl sm:mt-10"
      onMouseEnter={auto.pause}
      onMouseLeave={auto.resume}
    >
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8">
        <h2 id="shop-by-category" className="font-display text-lg sm:text-2xl md:text-3xl">
          Shop by category
        </h2>
      </div>
      <div className="relative mt-3 sm:mt-4">
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => scrollByDir(-1)}
          className="absolute left-1 top-[38%] z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card/95 text-ink shadow-sm sm:left-3 sm:top-[42%] sm:flex sm:h-10 sm:w-10 sm:shadow-lg lg:left-4"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </button>
        <button
          type="button"
          aria-label="Next categories"
          onClick={() => scrollByDir(1)}
          className="absolute right-1 top-[38%] z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card/95 text-ink shadow-sm sm:right-3 sm:top-[42%] sm:flex sm:h-10 sm:w-10 sm:shadow-lg lg:right-4"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </button>
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:gap-5 sm:px-16 sm:pb-2 lg:px-20"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="w-[3.6rem] shrink-0 snap-start sm:w-[7.75rem] md:w-[9.25rem]"
            >
              <div className="aspect-square overflow-hidden rounded-full border border-line bg-elev sm:rounded-2xl sm:shadow-sm sm:transition sm:hover:border-gold/50 sm:hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryImage(c.slug, c.imageUrl)} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-tight text-ink sm:mt-2.5 sm:text-sm sm:font-semibold">
                {c.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
