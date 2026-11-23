import Link from "next/link";
import { headers } from "next/headers";
import { shopCategories, listLiveProducts } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { prisma } from "@/lib/db";

export default async function ShopHomePage() {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const [categories, featured, newest, vendors] = await Promise.all([
    shopCategories(),
    listLiveProducts(8, { featured: true }),
    listLiveProducts(8),
    prisma.vendor.findMany({
      where: { shopStatus: "approved" },
      select: { slug: true, businessName: true, city: true, state: true, logoUrl: true },
      take: 8,
      orderBy: { businessName: "asc" }
    })
  ]);
  const best = [...featured].sort((a, b) => b.ratingAvg - a.ratingAvg);
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-10 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">NaijaSpa Shop</p>
        <h1 className="mt-2 font-display text-4xl">Beauty and wellness, delivered.</h1>
        <p className="mt-3 max-w-xl text-ink2">Skincare, oils, tools and spa supplies from approved Nigerian sellers. Book treatments on the main NaijaSpa site.</p>
      </section>
      <section className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">Shop by category</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.slug} href={href(`/c/${c.slug}`)} className="rounded-3xl border border-line bg-card p-4 font-semibold">
              {c.name}
            </Link>
          ))}
        </div>
      </section>
      {[
        { title: "Featured", items: featured.length ? featured : newest },
        { title: "New arrivals", items: newest },
        { title: "Best sellers", items: best }
      ].map((rail) => (
        <section key={rail.title} className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
          <h2 className="font-display text-2xl">{rail.title}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rail.items.length ? rail.items.map((p) => (
              <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
            )) : <p className="text-sm text-ink2">Products appear here after admin approval.</p>}
          </div>
        </section>
      ))}
      <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">Featured sellers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {vendors.map((v) => (
            <Link key={v.slug} href={href(`/store/${v.slug}`)} className="rounded-3xl border border-line bg-card p-4">
              <p className="font-semibold">{v.businessName}</p>
              <p className="text-sm text-ink2">{[v.city, v.state].filter(Boolean).join(", ")}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
