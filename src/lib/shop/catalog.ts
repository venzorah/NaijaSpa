import { cache } from "react";
import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS, SHOP_CATEGORIES } from "./constants";
import { shopQuery } from "./safe-query";
import { unitSaleKobo } from "./quote";

export function fallbackShopCategories() {
  return SHOP_CATEGORIES.map((c, sortOrder) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: "",
    parentId: null as string | null,
    sortOrder: sortOrder + 1,
    active: true
  }));
}

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 6 },
  variants: { where: { active: true }, orderBy: { priceKobo: "asc" as const } },
  vendor: { select: { slug: true, businessName: true, state: true, city: true, shopStatus: true } },
  category: { select: { slug: true, name: true } }
};

export function mapProduct(p: {
  variants: { priceKobo: number; compareKobo: number; stockOnHand: number; reserved: number }[];
  images: { url: string }[];
  name: string;
  slug: string;
  ratingAvg: number;
  reviewCount: number;
  featured: boolean;
  sponsoredUntil: Date | null;
  vendor: { slug: string; businessName: string; state: string; city: string };
  category: { slug: string; name: string };
  description?: string;
}) {
  const variant = p.variants[0];
  const stock = p.variants.reduce((s, v) => s + Math.max(0, v.stockOnHand - v.reserved), 0);
  return {
    ...p,
    image: p.images[0]?.url || "/photos/band-spa.jpg",
    priceKobo: variant ? unitSaleKobo(variant.priceKobo, variant.compareKobo) : 0,
    compareKobo: variant?.compareKobo ?? 0,
    inStock: stock > 0,
    sponsored: Boolean(p.sponsoredUntil && p.sponsoredUntil > new Date())
  };
}

export async function listLiveProducts(take = 12, extra?: { featured?: boolean }) {
  const rows = await shopQuery(
    () =>
      prisma.shopProduct.findMany({
        where: {
          status: LIVE_PRODUCT_STATUS,
          vendor: { shopStatus: "approved" },
          ...(extra?.featured ? { featured: true } : {})
        },
        include: productInclude,
        orderBy: extra?.featured ? { ratingAvg: "desc" } : { createdAt: "desc" },
        take
      }),
    []
  );
  return rows.map(mapProduct);
}

export const shopCategories = cache(async function shopCategories() {
  const rows = await shopQuery(
    () => prisma.shopCategory.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    fallbackShopCategories()
  );
  return rows.length ? rows : fallbackShopCategories();
});
