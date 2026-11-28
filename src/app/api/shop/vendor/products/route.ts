import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { canDraftShopProducts } from "@/lib/shop/onboarding";
import { shopProductSaveStatus, shopProductWriteSchema, upsertShopProduct } from "@/lib/shop/upsert-product";
import { shopProductImageMaxBytes } from "@/lib/shop/ensure";

export async function GET() {
  try {
    const user = await requireVendor();
    await ensureShopCatalog();
    const products = await prisma.shopProduct.findMany({
      where: { vendorId: user.vendorId },
      include: { variants: true, images: { orderBy: { sortOrder: "asc" } }, category: true },
      orderBy: { updatedAt: "desc" }
    });
    const categories = await prisma.shopCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    const maxImageBytes = await shopProductImageMaxBytes();
    return NextResponse.json({ products, categories, maxImageBytes });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendorId } });
    if (!canDraftShopProducts(vendor?.shopStatus)) {
      return NextResponse.json({ error: "Finish store setup first, then list products." }, { status: 403 });
    }
    const body = shopProductWriteSchema.parse(await req.json());
    let existingStatus: string | undefined;
    if (body.id) {
      const existing = await prisma.shopProduct.findFirst({
        where: { id: body.id, vendorId: user.vendorId },
        select: { status: true }
      });
      if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      existingStatus = existing.status;
    }
    const status = shopProductSaveStatus({ intent: body.intent, existing: existingStatus, fallback: "draft" });
    const product = await upsertShopProduct(user.vendorId, body, status);
    return NextResponse.json({ product });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({ id: z.string(), status: z.enum(["draft", "approved", "unpublished", "archived"]) })
      .parse(await req.json());
    const product = await prisma.shopProduct.findFirst({ where: { id: body.id, vendorId: user.vendorId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const updated = await prisma.shopProduct.update({ where: { id: product.id }, data: { status: body.status } });
    return NextResponse.json({ product: updated });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireVendor();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const product = await prisma.shopProduct.findFirst({ where: { id, vendorId: user.vendorId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await prisma.shopProduct.update({ where: { id }, data: { status: "archived" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
