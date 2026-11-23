import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { unitSaleKobo } from "@/lib/shop/quote";

export async function GET(req: Request) {
  try {
    await ensureShopCatalog();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "";
    const vendor = url.searchParams.get("vendor") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const min = Number(url.searchParams.get("min") ?? 0);
    const max = Number(url.searchParams.get("max") ?? 0);
    const rating = Number(url.searchParams.get("rating") ?? 0);
    const sort = url.searchParams.get("sort") ?? "new";
    const where = {
      status: LIVE_PRODUCT_STATUS,
      vendor: { shopStatus: "approved", ...(state ? { state } : {}), ...(vendor ? { slug: vendor } : {}) },
      ...(category ? { category: { slug: category } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(rating > 0 ? { ratingAvg: { gte: rating } } : {})
    };
    const products = await prisma.shopProduct.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { active: true }, orderBy: { priceKobo: "asc" } },
        vendor: { select: { slug: true, businessName: true, state: true, city: true } },
        category: { select: { slug: true, name: true } }
      },
      orderBy: sort === "rating" ? { ratingAvg: "desc" } : { createdAt: "desc" },
      take: 60
    });
    const categories = await prisma.shopCategory.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" } });
    const mapped = products
      .map((p) => {
        const variant = p.variants[0];
        const price = variant ? unitSaleKobo(variant.priceKobo, variant.compareKobo) : 0;
        const stock = p.variants.reduce((s, v) => s + Math.max(0, v.stockOnHand - v.reserved), 0);
        return { ...p, priceKobo: price, inStock: stock > 0 };
      })
      .filter((p) => (min ? p.priceKobo >= min : true) && (max ? p.priceKobo <= max : true) && (url.searchParams.get("available") === "1" ? p.inStock : true));
    return NextResponse.json({ categories, products: mapped });
  } catch (e) {
    return jsonError(e);
  }
}
