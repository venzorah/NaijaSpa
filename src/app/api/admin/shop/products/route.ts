import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { notifyShopUser } from "@/lib/shop/notify";

export async function GET() {
  try {
    await requireAdmin(["shop.manage", "catalog.manage"]);
    const products = await prisma.shopProduct.findMany({
      include: { vendor: { select: { businessName: true, ownerId: true } }, category: true, variants: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    });
    return NextResponse.json({ products });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z.object({ id: z.string(), status: z.enum(["approved", "rejected", "suspended", "archived"]), reason: z.string().max(240).optional() }).parse(await req.json());
    const product = await prisma.shopProduct.update({
      where: { id: body.id },
      data: { status: body.status },
      include: { vendor: true }
    });
    await notifyShopUser(product.vendor.ownerId, "Product review", `${product.name} is ${body.status}${body.reason ? `: ${body.reason}` : "."}`, "/vendor/shop/products");
    return NextResponse.json({ product });
  } catch (e) {
    return jsonError(e);
  }
}
