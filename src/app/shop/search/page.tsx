import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct, shopCategories } from "@/lib/shop/catalog";
import { applyShopCatalogFilters, parseShopCatalogQuery } from "@/lib/shop/filters";
import { shopQuery } from "@/lib/shop/safe-query";
import { ProductCard } from "@/components/shop/product-card";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseShopCatalogQuery(await searchParams);
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
            ...(filters.category ? { category: { slug: filters.category } } : {}),
            ...(filters.rating ? { ratingAvg: { gte: filters.rating } } : {}),
            ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { description: { contains: filters.q, mode: "insensitive" } }] } : {})
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
  const products = applyShopCatalogFilters(rows.map(mapProduct), filters);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-4xl">{filters.q ? `Results for “${filters.q}”` : "All products"}</h1>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28">
          <details className="lg:hidden">
            <summary className="cursor-pointer list-none rounded-full bg-elev px-4 py-3 text-sm font-bold">Filters</summary>
            <div className="mt-3">
              <ShopFilters action={href("/search")} resetHref={href("/search")} categories={categories} values={filters} />
            </div>
          </details>
          <div className="hidden lg:block">
            <ShopFilters action={href("/search")} resetHref={href("/search")} categories={categories} values={filters} />
          </div>
        </div>
        <div>
          {products.length ? (
            <>
              <p className="text-sm text-ink2">{products.length} product{products.length === 1 ? "" : "s"}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard
                    key={p.slug}
                    href={href(`/p/${p.slug}`)}
                    name={p.name}
                    image={p.image}
                    priceKobo={p.priceKobo}
                    compareKobo={p.compareKobo}
                    vendor={p.vendor.businessName}
                    category={p.category.name}
                    ratingAvg={p.ratingAvg}
                    reviewCount={p.reviewCount}
                    sponsored={p.sponsored}
                  />
                ))}
              </div>
            </>
          ) : (
            <ShopEmptyState
              title={filters.q || filters.category || filters.minNaira || filters.maxNaira || filters.rating ? "No matching products" : "Catalog is empty"}
              body="Approved oils, soaps and tools will appear here. Try another filter, or sell on Shop if you are a vendor."
              href={href("/sell")}
              cta="Sell on Shop"
            />
          )}
        </div>
      </div>
    </div>
  );
}
