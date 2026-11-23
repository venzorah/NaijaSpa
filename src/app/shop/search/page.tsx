import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct, shopCategories } from "@/lib/shop/catalog";
import { shopQuery } from "@/lib/shop/safe-query";
import { ProductCard } from "@/components/shop/product-card";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const [categories, rows] = await Promise.all([
    shopCategories(),
    shopQuery(
      () =>
        prisma.shopProduct.findMany({
          where: {
            status: LIVE_PRODUCT_STATUS,
            vendor: { shopStatus: "approved" },
            ...(category ? { category: { slug: category } } : {}),
            ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {})
          },
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
            variants: { where: { active: true } },
            vendor: { select: { slug: true, businessName: true, state: true, city: true } },
            category: { select: { slug: true, name: true } }
          },
          take: 60
        }),
      []
    )
  ]);
  const products = rows.map(mapProduct);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-4xl">{q ? `Results for “${q}”` : "All products"}</h1>
      <form className="mt-6 flex flex-wrap gap-2 rounded-[1.5rem] border border-line bg-card p-3">
        <input name="q" defaultValue={q} className="h-11 min-w-[12rem] flex-1 rounded-full border border-line px-4" placeholder="Search products" />
        <select name="category" defaultValue={category} className="h-11 rounded-full border border-line px-3">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button className="h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold">Filter</button>
      </form>
      {products.length ? (
        <>
          <p className="mt-4 text-sm text-ink2">{products.length} product{products.length === 1 ? "" : "s"}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
            ))}
          </div>
        </>
      ) : (
        <ShopEmptyState
          title={q ? "No matching products" : "Catalog is empty"}
          body="Approved oils, soaps and tools will appear here. Try another search, or sell on Shop if you are a vendor."
          href={href("/sell")}
          cta="Sell on Shop"
        />
      )}
    </div>
  );
}
