import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { searchServices } from "@/lib/search";
import { demoCategories } from "@/lib/demo-catalog";
import { categoryImage } from "@/lib/category-images";
import { ExploreResultCard } from "@/components/explore-result-card";
import { EmptyState } from "@/components/empty-state";
import { formatNgn } from "@/lib/money";
import { CategoryCarousel } from "@/components/category-carousel";
import { cookies } from "next/headers";
import { PLACE_COOKIE, parsePlaceCookie } from "@/lib/nigeria";
import { exploreHref } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

type CategoryRow = {
  slug: string;
  name: string;
  imageUrl?: string | null;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
};

async function loadCategories(): Promise<CategoryRow[]> {
  let categories: CategoryRow[] = demoCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.imageUrl,
    description: "",
    metaTitle: "",
    metaDescription: ""
  }));
  try {
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    if (rows.length) {
      categories = rows.map((c) => ({
        slug: c.slug,
        name: c.name,
        imageUrl: c.imageUrl,
        description: c.description,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription
      }));
    }
  } catch {
    /* demo list */
  }
  return categories;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await loadCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: "Category" };
  return {
    title: cat.metaTitle || cat.name,
    description: cat.metaDescription || cat.description || `Book ${cat.name} with verified therapists on NaijaSpa.`
  };
}

export default async function CategoryLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await loadCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const place = parsePlaceCookie((await cookies()).get(PLACE_COOKIE)?.value);
  const exploreWithCategory = exploreHref(place, { category: slug });
  const data = await searchServices({ category: slug, take: 24, sort: "rating" });
  const from = data.results.length ? Math.min(...data.results.map((r) => r.quote.customerTotalKobo)) : 0;
  const providers = [...new Map(data.results.map((r) => [r.vendor.slug, r.vendor])).values()];

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={categoryImage(cat.slug, cat.imageUrl)} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[#0B120E]/70" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 lg:px-8 lg:pb-16">
          <Link
            href={exploreHref(place)}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="mt-8 font-display text-5xl font-semibold text-white">{cat.name}</h1>
          {cat.description ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">{cat.description}</p> : null}
          {data.total > 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#E3C766]">
              {data.total} treatments · from {formatNgn(from)}
            </p>
          ) : null}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <CategoryCarousel categories={categories} place={place} />
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Treatments</p>
              <h2 className="font-display text-2xl font-semibold text-ink">Top {cat.name.toLowerCase()}</h2>
            </div>
            <Link href={exploreWithCategory} className="text-sm font-semibold text-goldink">
              Filter
            </Link>
          </div>
          {data.results.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.results.map((r) => (
                <li key={r.service.id}>
                  <ExploreResultCard result={r} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Coming soon"
              text={`We’re onboarding ${cat.name.toLowerCase()} providers in your city. Check back shortly.`}
              actionHref="/explore"
              actionLabel="Explore all"
            />
          )}
        </section>
        {providers.length > 0 ? (
          <section className="mt-12 pb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Where to go</p>
            <h2 className="font-display text-2xl font-semibold text-ink">Providers offering this</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => (
                <li key={p.slug}>
                  <Link href={`/providers/${encodeURIComponent(p.slug)}`} className="block overflow-hidden rounded-3xl border border-line bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverUrl || "/photos/spa.jpg"} alt="" className="h-36 w-full object-cover" />
                    <div className="p-4">
                      <p className="font-semibold text-ink">{p.businessName}</p>
                      <p className="text-xs text-ink2">
                        {p.neighbourhood}, {p.city}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
