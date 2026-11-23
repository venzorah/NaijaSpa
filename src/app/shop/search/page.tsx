import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct, shopCategories } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const [categories, rows] = await Promise.all([
    shopCategories(),
    prisma.shopProduct.findMany({
      where: {
        status: LIVE_PRODUCT_STATUS,
        vendor: { shopStatus: "approved" },
        ...(category ? { category: { slug: category } } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {})
      },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { active: true } }, vendor: { select: { slug: true, businessName: true, state: true, city: true } }, category: { select: { slug: true, name: true } } },
      take: 60
    })
  ]);
  const products = rows.map(mapProduct);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">Search</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="h-11 min-w-[12rem] flex-1 rounded-full border border-line px-4" placeholder="Search products" />
        <select name="category" defaultValue={category} className="h-11 rounded-full border border-line px-3">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button className="h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold">Filter</button>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
        ))}
      </div>
    </div>
  );
}
