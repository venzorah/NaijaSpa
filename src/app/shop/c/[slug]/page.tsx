import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { fallbackShopCategories, mapProduct } from "@/lib/shop/catalog";
import { shopQuery } from "@/lib/shop/safe-query";
import { ProductCard } from "@/components/shop/product-card";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { ShopCategoryMark } from "@/components/shop/category-mark";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function ShopCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const fromDb = await shopQuery(() => prisma.shopCategory.findUnique({ where: { slug } }), null);
  const category = fromDb ?? fallbackShopCategories().find((c) => c.slug === slug);
  if (!category || !category.active) notFound();
  const rows = fromDb
    ? await shopQuery(
        () =>
          prisma.shopProduct.findMany({
            where: { status: LIVE_PRODUCT_STATUS, categoryId: fromDb.id, vendor: { shopStatus: "approved" } },
            include: {
              images: { take: 1, orderBy: { sortOrder: "asc" } },
              variants: { where: { active: true } },
              vendor: { select: { slug: true, businessName: true, state: true, city: true } },
              category: { select: { slug: true, name: true } }
            }
          }),
        []
      )
    : [];
  const products = rows.map(mapProduct);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex items-center gap-4">
        <span className="flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-elev ring-1 ring-line sm:h-28 sm:w-28">
          <ShopCategoryMark slug={category.slug} className="h-full w-full" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Category</p>
          <h1 className="mt-1 font-display text-3xl md:text-4xl">{category.name}</h1>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-ink2">{"description" in category && category.description ? category.description : "Approved wellness products in this category."}</p>
      {products.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
      ) : (
        <ShopEmptyState
          title="No live products yet"
          body="Sellers can list in this category. Admin must approve before items appear here."
          href={href("/search")}
          cta="Browse all products"
        />
      )}
    </div>
  );
}
