import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { mapProduct } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function VendorStorePage({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const { vendorSlug } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { slug: vendorSlug } });
  if (!vendor || vendor.shopStatus !== "approved") notFound();
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const rows = await prisma.shopProduct.findMany({
    where: { vendorId: vendor.id, status: LIVE_PRODUCT_STATUS },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { active: true } }, vendor: { select: { slug: true, businessName: true, state: true, city: true } }, category: { select: { slug: true, name: true } } }
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">{vendor.businessName}</h1>
      <p className="text-sm text-ink2">{vendor.city}, {vendor.state}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(mapProduct).map((p) => (
          <ProductCard key={p.slug} href={href(`/p/${p.slug}`)} name={p.name} image={p.image} priceKobo={p.priceKobo} compareKobo={p.compareKobo} />
        ))}
      </div>
    </div>
  );
}
