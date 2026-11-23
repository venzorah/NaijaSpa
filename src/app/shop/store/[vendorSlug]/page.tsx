import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct } from "@/lib/shop/catalog";
import { shopQuery } from "@/lib/shop/safe-query";
import { ProductCard } from "@/components/shop/product-card";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function VendorStorePage({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const { vendorSlug } = await params;
  const vendor = await shopQuery(
    () =>
      prisma.vendor.findUnique({
        where: { slug: vendorSlug },
        select: { id: true, slug: true, businessName: true, city: true, state: true, shopStatus: true, logoUrl: true }
      }),
    null
  );
  if (!vendor || vendor.shopStatus !== "approved") notFound();
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const rows = await shopQuery(
    () =>
      prisma.shopProduct.findMany({
        where: { vendorId: vendor.id, status: LIVE_PRODUCT_STATUS },
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          variants: { where: { active: true } },
          vendor: { select: { slug: true, businessName: true, state: true, city: true } },
          category: { select: { slug: true, name: true } }
        }
      }),
    []
  );
  const products = rows.map(mapProduct);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Store</p>
      <h1 className="mt-1 font-display text-4xl">{vendor.businessName}</h1>
      <p className="mt-2 text-sm text-ink2">{[vendor.city, vendor.state].filter(Boolean).join(", ")}</p>
      {products.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} vendor={p.vendor.businessName} sponsored={p.sponsored} />
          ))}
        </div>
      ) : (
        <ShopEmptyState title="This store has no live products" body="Items appear after the seller lists them and admin approves." href={href("/search")} cta="Browse other products" />
      )}
    </div>
  );
}
