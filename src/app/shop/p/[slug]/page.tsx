import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { formatNgn } from "@/lib/money";
import { shopHostFromHeaders, shopPublicPath, SHOP_PUBLIC_URL } from "@/lib/shop-host";
import { AddToCart } from "@/components/shop/add-to-cart";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductReviewForm } from "@/components/shop/review-form";
import { shopQuery } from "@/lib/shop/safe-query";
import { unitSaleKobo } from "@/lib/shop/quote";
import { shopProductSeo } from "@/lib/shop/seo";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await shopQuery(
    () => prisma.shopProduct.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }),
    null
  );
  if (!product || product.status !== LIVE_PRODUCT_STATUS) return { robots: { index: false } };
  const seo = shopProductSeo(product);
  const image = product.images[0]?.url;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `${SHOP_PUBLIC_URL}/p/${product.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SHOP_PUBLIC_URL}/p/${product.slug}`,
      ...(image ? { images: [{ url: image }] } : {})
    },
    robots: { index: true, follow: true }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await shopQuery(
    () =>
      prisma.shopProduct.findUnique({
        where: { slug },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { active: true } },
          vendor: true,
          category: true,
          reviews: { where: { status: "published" }, include: { user: { select: { name: true } } }, take: 12, orderBy: { createdAt: "desc" } }
        }
      }),
    null
  );
  if (!product || product.status !== LIVE_PRODUCT_STATUS || product.vendor.shopStatus !== "approved") notFound();
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const variant = product.variants[0];
  const price = variant ? unitSaleKobo(variant.priceKobo, variant.compareKobo) : 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.metaDescription || product.description,
    image: product.images.map((img) => img.url).slice(0, 3),
    brand: product.vendor.businessName,
    offers: { "@type": "Offer", priceCurrency: "NGN", price: price / 100, availability: "https://schema.org/InStock" }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs text-ink2">
        <Link href={href("/")} className="hover:text-ink">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={href(`/c/${product.category.slug}`)} className="hover:text-ink">{product.category.name}</Link>
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <ProductGallery images={product.images.map((img) => img.url)} name={product.name} />
        <div className="lg:sticky lg:top-28 lg:self-start">
          {product.sponsoredUntil && product.sponsoredUntil > new Date() ? <p className="text-xs font-bold uppercase tracking-wide text-goldink">Sponsored placement</p> : null}
          <h1 className="font-display text-3xl sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-sm text-ink2">
            <Link className="font-semibold text-ink" href={href(`/store/${product.vendor.slug}`)}>{product.vendor.businessName}</Link>
            <span> · {product.vendor.city}, {product.vendor.state}</span>
            {product.reviewCount ? <span> · {product.ratingAvg.toFixed(1)} / 5 ({product.reviewCount})</span> : null}
          </p>
          <p className="mt-5 font-display text-3xl text-goldink">{formatNgn(price)}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink2">{product.description || "Details from the seller."}</p>
          {variant ? <AddToCart variants={product.variants} productName={product.name} image={product.images[0]?.url} /> : null}
          <div className="mt-8 grid gap-3">
            {product.ingredients ? <div className="rounded-3xl border border-line bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-goldink">Ingredients</p><p className="mt-2 text-sm text-ink2">{product.ingredients}</p></div> : null}
            {product.usage ? <div className="rounded-3xl border border-line bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-goldink">How to use</p><p className="mt-2 text-sm text-ink2">{product.usage}</p></div> : null}
            {product.warnings ? <div className="rounded-3xl border border-line bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-goldink">Warnings</p><p className="mt-2 text-sm text-ink2">{product.warnings}</p></div> : null}
          </div>
        </div>
      </div>
      <section className="mt-14">
        <h2 className="font-display text-3xl">Reviews</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {product.reviews.map((r) => (
            <figure key={r.id} className="rounded-[1.5rem] border border-line bg-card p-5">
              <p className="text-sm font-semibold text-goldink">{r.rating} / 5</p>
              <blockquote className="mt-2 text-sm leading-relaxed">{r.body}</blockquote>
              <figcaption className="mt-3 text-xs text-ink2">{r.user.name.split(" ")[0]}</figcaption>
            </figure>
          ))}
          {!product.reviews.length ? <p className="text-sm text-ink2">No reviews yet. Buyers can rate after a paid Shop order.</p> : null}
        </div>
        <ProductReviewForm productId={product.id} />
      </section>
    </div>
  );
}
