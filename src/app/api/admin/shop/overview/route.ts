import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ensureShopCatalog } from "@/lib/shop/ensure";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    await ensureShopCatalog();
    const [vendors, products, orders, pendingVendors, pendingProducts] = await Promise.all([
      prisma.vendor.count({ where: { shopStatus: "approved" } }),
      prisma.shopProduct.count({ where: { status: "approved" } }),
      prisma.shopMasterOrder.count({ where: { status: "paid" } }),
      prisma.vendor.count({ where: { shopStatus: "pending" } }),
      prisma.shopProduct.count({ where: { status: "pending" } })
    ]);
    return NextResponse.json({ vendors, products, orders, pendingVendors, pendingProducts });
  } catch (e) {
    return jsonError(e);
  }
}
