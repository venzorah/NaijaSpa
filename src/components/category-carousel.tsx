"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryImage } from "@/lib/category-images";

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl?: string | null;
};

export function CategoryCarousel({ categories }: { categories: CategoryTile[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  if (categories.length === 0) return null;

  const scrollByDir = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.7, 280), behavior: "smooth" });
  };

  return (
    <section aria-labelledby="shop-by-category" className="mx-auto mt-10 max-w-7xl">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8">
        <h2 id="shop-by-category" className="font-display text-2xl md:text-3xl">
          Shop by category
        </h2>
      </div>
      <div className="relative mt-4">
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => scrollByDir(-1)}
          className="absolute left-1 top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-ink shadow-lg sm:left-3 lg:left-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next categories"
          onClick={() => scrollByDir(1)}
          className="absolute right-1 top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-ink shadow-lg sm:right-3 lg:right-4"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-12 pb-2 sm:gap-5 sm:px-16 lg:px-20"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="w-[7.75rem] shrink-0 snap-start sm:w-[9.25rem]"
            >
              <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-elev shadow-sm transition hover:border-gold/50 hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryImage(c.slug, c.imageUrl)} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="mt-2.5 text-center text-sm font-semibold leading-snug text-ink">{c.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
