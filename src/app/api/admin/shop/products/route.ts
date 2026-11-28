import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { notifyShopUser } from "@/lib/shop/notify";
import { shopProductSaveStatus, shopProductWriteSchema, upsertShopProduct } from "@/lib/shop/upsert-product";

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

export async function POST(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = shopProductWriteSchema.extend({ vendorId: z.string().min(1), live: z.boolean().optional() }).parse(await req.json());
    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const { vendorId, live, ...product } = body;
    let existingStatus: string | undefined;
    if (product.id) {
      const existing = await prisma.shopProduct.findFirst({ where: { id: product.id, vendorId }, select: { status: true } });
      existingStatus = existing?.status;
    }
    const status = shopProductSaveStatus({
      intent: product.intent,
      existing: existingStatus,
      fallback: live === false ? "pending" : "approved"
    });
    const saved = await upsertShopProduct(vendorId, product, status);
    await notifyShopUser(
      vendor.ownerId,
      "Product listing",
      product.id ? `${saved.name} was updated by Admin.` : `${saved.name} was listed for your store by Admin.`,
      "/vendor/shop/products"
    );
    return NextResponse.json({ product: saved });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z
      .object({
        id: z.string(),
        status: z.enum(["approved", "draft", "unpublished", "rejected", "suspended", "archived"]),
        reason: z.string().max(240).optional()
      })
      .parse(await req.json());
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
