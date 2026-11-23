import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { shopCategories, listLiveProducts } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { prisma } from "@/lib/db";
import { duringNextBuild } from "@/lib/live-db";
import { PUBLIC_SITE_URL } from "@/lib/public-origin";

export default async function ShopHomePage() {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  let categories: Awaited<ReturnType<typeof shopCategories>> = [];
  let featured: Awaited<ReturnType<typeof listLiveProducts>> = [];
  let newest: Awaited<ReturnType<typeof listLiveProducts>> = [];
  let vendors: { slug: string; businessName: string; city: string | null; state: string | null; logoUrl: string | null }[] = [];
  try {
    [categories, featured, newest, vendors] = await Promise.all([
      shopCategories(),
      listLiveProducts(8, { featured: true }),
      listLiveProducts(8),
      duringNextBuild() || !process.env.DATABASE_URL
        ? Promise.resolve(vendors)
        : prisma.vendor.findMany({
            where: { shopStatus: "approved" },
            select: { slug: true, businessName: true, city: true, state: true, logoUrl: true },
            take: 8,
            orderBy: { businessName: "asc" }
          }).catch(() => [])
    ]);
  } catch {
    categories = [];
    featured = [];
    newest = [];
    vendors = [];
  }
  const best = [...featured].sort((a, b) => b.ratingAvg - a.ratingAvg);
  const rails = [
    { title: "Featured", kicker: "Curated", items: featured.length ? featured : newest },
    { title: "New arrivals", kicker: "Just listed", items: newest },
    { title: "Best sellers", kicker: "Most loved", items: best }
  ];
  return (
    <div>
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/photos/band-spa.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/70 to-forest/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">NaijaSpa Shop</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl text-white md:text-5xl">Oils, soaps and tools from verified sellers.</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80">A specialised beauty and wellness store — not a general marketplace. Book treatments on NaijaSpa; buy products here.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href("/search")} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">Shop products</Link>
            <a href={PUBLIC_SITE_URL} className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white">Book a treatment</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Browse</p>
            <h2 className="mt-1 font-display text-3xl">Shop by category</h2>
          </div>
          <Link href={href("/search")} className="hidden text-sm font-semibold text-goldink sm:inline-flex items-center gap-1">See all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.slug} href={href(`/c/${c.slug}`)} className="rounded-[1.5rem] border border-line bg-card p-4 transition hover:border-gold/50 hover:bg-gold/5">
              <p className="font-semibold leading-snug">{c.name}</p>
              <p className="mt-1 text-xs text-ink2">Approved wellness goods</p>
            </Link>
          ))}
        </div>
      </section>

      {rails.map((rail) => (
        <section key={rail.title} className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">{rail.kicker}</p>
          <h2 className="mt-1 font-display text-3xl">{rail.title}</h2>
          {rail.items.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {rail.items.map((p) => (
                <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] border border-dashed border-line bg-card p-8 text-sm text-ink2">
              Products appear here after a seller lists them and admin approves.
            </div>
          )}
        </section>
      ))}

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Stores</p>
        <h2 className="mt-1 font-display text-3xl">Featured sellers</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {vendors.length ? vendors.map((v) => (
            <Link key={v.slug} href={href(`/store/${v.slug}`)} className="rounded-[1.5rem] border border-line bg-card p-5 transition hover:border-gold/40">
              <p className="font-semibold">{v.businessName}</p>
              <p className="mt-1 text-sm text-ink2">{[v.city, v.state].filter(Boolean).join(", ")}</p>
            </Link>
          )) : (
            <p className="text-sm text-ink2">Approved product stores will show here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
