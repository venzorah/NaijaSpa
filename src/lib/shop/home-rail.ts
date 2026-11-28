import { prisma } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { listLiveProducts, mapProduct } from "@/lib/shop/catalog";
import { shopQuery } from "@/lib/shop/safe-query";
import { isExtraHomeSection, orderByKeys, sectionKind, type HomeSection } from "@/lib/home-sections";

export type HomeShopProduct = ReturnType<typeof mapProduct>;

async function liveProductsByIds(ids: string[], take: number) {
  if (!ids.length) return [];
  const rows = await shopQuery(
    () =>
      prisma.shopProduct.findMany({
        where: {
          id: { in: ids.slice(0, 48) },
          status: LIVE_PRODUCT_STATUS,
          vendor: { shopStatus: "approved" }
        },
        include: {
          images: { orderBy: { sortOrder: "asc" as const }, take: 3 },
          variants: { where: { active: true }, orderBy: { priceKobo: "asc" as const } },
          vendor: { select: { slug: true, businessName: true, state: true, city: true, shopStatus: true } },
          category: { select: { slug: true, name: true } }
        }
      }),
    []
  );
  return orderByKeys(rows.map(mapProduct), ids, (item) => item.id).slice(0, take);
}

export async function productsForHomeSection(section: HomeSection, take: number): Promise<HomeShopProduct[]> {
  if (!section.visible || sectionKind(section) !== "shopProducts") return [];
  if (section.source === "manual") return liveProductsByIds(section.productIds, take);
  return listLiveProducts(take);
}

export async function homeShopProductRails(layout: HomeSection[], take = 12) {
  const shopProducts: HomeShopProduct[] = [];
  const extraShopProducts: Record<string, HomeShopProduct[]> = {};
  for (const section of layout) {
    if (sectionKind(section) !== "shopProducts") continue;
    const rows = await productsForHomeSection(section, take);
    if (isExtraHomeSection(section)) extraShopProducts[section.id] = rows;
    else shopProducts.push(...rows);
  }
  return { shopProducts, extraShopProducts };
}
