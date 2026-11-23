import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function ShopCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.shopCategory.findUnique({ where: { slug } });
  if (!category || !category.active) notFound();
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const rows = await prisma.shopProduct.findMany({
    where: { status: LIVE_PRODUCT_STATUS, categoryId: category.id, vendor: { shopStatus: "approved" } },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { active: true } }, vendor: { select: { slug: true, businessName: true, state: true, city: true } }, category: { select: { slug: true, name: true } } }
  });
  const products = rows.map(mapProduct);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">{category.name}</h1>
      <p className="mt-2 text-ink2">{category.description || "Approved wellness products in this category."}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
        ))}
      </div>
    </div>
  );
}
