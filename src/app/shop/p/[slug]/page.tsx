import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { formatNgn } from "@/lib/money";
import { shopHostFromHeaders, shopPublicPath, SHOP_PUBLIC_URL } from "@/lib/shop-host";
import { AddToCart } from "@/components/shop/add-to-cart";
import { unitSaleKobo } from "@/lib/shop/quote";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.shopProduct.findUnique({ where: { slug } });
  if (!product || product.status !== LIVE_PRODUCT_STATUS) return { robots: { index: false } };
  return {
    title: product.name,
    description: product.description.slice(0, 160) || `Buy ${product.name} on NaijaSpa Shop.`,
    alternates: { canonical: `${SHOP_PUBLIC_URL}/p/${product.slug}` },
    openGraph: { title: product.name, description: product.description.slice(0, 160), url: `${SHOP_PUBLIC_URL}/p/${product.slug}` },
    robots: { index: true, follow: true }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.shopProduct.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true } },
      vendor: true,
      category: true,
      reviews: { where: { status: "published" }, include: { user: { select: { name: true } } }, take: 12, orderBy: { createdAt: "desc" } }
    }
  });
  if (!product || product.status !== LIVE_PRODUCT_STATUS || product.vendor.shopStatus !== "approved") notFound();
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const variant = product.variants[0];
  const price = variant ? unitSaleKobo(variant.priceKobo, variant.compareKobo) : 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: product.vendor.businessName,
    offers: { "@type": "Offer", priceCurrency: "NGN", price: price / 100, availability: "https://schema.org/InStock" }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.images[0]?.url || "/photos/band-spa.jpg"} alt="" className="h-96 w-full object-cover" />
        </div>
        <div>
          {product.sponsoredUntil && product.sponsoredUntil > new Date() ? <p className="text-xs font-bold uppercase text-goldink">Sponsored</p> : null}
          <h1 className="font-display text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm text-ink2">
            <a className="font-semibold" href={href(`/store/${product.vendor.slug}`)}>{product.vendor.businessName}</a> · {product.vendor.city}, {product.vendor.state}
          </p>
          <p className="mt-4 text-2xl font-bold text-goldink">{formatNgn(price)}</p>
          <p className="mt-4 text-sm leading-relaxed">{product.description}</p>
          {variant ? <AddToCart variants={product.variants} /> : null}
          {product.ingredients ? <><h2 className="mt-8 font-semibold">Ingredients</h2><p className="text-sm text-ink2">{product.ingredients}</p></> : null}
          {product.usage ? <><h2 className="mt-4 font-semibold">How to use</h2><p className="text-sm text-ink2">{product.usage}</p></> : null}
          {product.warnings ? <><h2 className="mt-4 font-semibold">Warnings</h2><p className="text-sm text-ink2">{product.warnings}</p></> : null}
        </div>
      </div>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Reviews</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {product.reviews.map((r) => (
            <figure key={r.id} className="rounded-3xl border border-line bg-card p-5">
              <p className="text-goldink">{r.rating} / 5</p>
              <blockquote className="mt-2 text-sm">{r.body}</blockquote>
              <figcaption className="mt-3 text-xs text-ink2">{r.user.name.split(" ")[0]}</figcaption>
            </figure>
          ))}
          {!product.reviews.length ? <p className="text-sm text-ink2">No reviews yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
