import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { SHOP_PUBLIC_URL } from "@/lib/shop-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.shopProduct.findMany({ where: { status: LIVE_PRODUCT_STATUS, vendor: { shopStatus: "approved" } }, select: { slug: true, updatedAt: true } }),
    prisma.shopCategory.findMany({ where: { active: true }, select: { slug: true } })
  ]);
  return [
    { url: SHOP_PUBLIC_URL, changeFrequency: "daily", priority: 1 },
    ...categories.map((c) => ({ url: `${SHOP_PUBLIC_URL}/c/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${SHOP_PUBLIC_URL}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.8 }))
  ];
}
