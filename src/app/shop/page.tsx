import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { shopCategories, listLiveProducts } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { ShopHero } from "@/components/shop/shop-hero";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { prisma } from "@/lib/db";
import { markShopDbUnavailable, shopDbUnavailable } from "@/lib/shop/ensure";
import { PUBLIC_SITE_URL } from "@/lib/public-origin";

export default async function ShopHomePage() {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const categories = await shopCategories();
  let featured: Awaited<ReturnType<typeof listLiveProducts>> = [];
  let newest: Awaited<ReturnType<typeof listLiveProducts>> = [];
  let vendors: { slug: string; businessName: string; city: string | null; state: string | null; logoUrl: string | null }[] = [];
  try {
    [featured, newest, vendors] = await Promise.all([
      listLiveProducts(8, { featured: true }),
      listLiveProducts(8),
      shopDbUnavailable()
        ? Promise.resolve(vendors)
        : prisma.vendor.findMany({
            where: { shopStatus: "approved" },
            select: { slug: true, businessName: true, city: true, state: true, logoUrl: true },
            take: 8,
            orderBy: { businessName: "asc" }
          }).catch(() => {
            markShopDbUnavailable();
            return vendors;
          })
    ]);
  } catch {
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
      <ShopHero searchHref={href("/search")} sellHref={href("/sell")} servicesHref={PUBLIC_SITE_URL} />

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
