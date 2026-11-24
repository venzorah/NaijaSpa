import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { shopSlug } from "@/lib/shop/slug";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { shopProductImages } from "@/lib/shop/product-media";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(4000).default(""),
  seoTitle: z.string().max(70).default(""),
  metaDescription: z.string().max(320).default(""),
  categoryId: z.string().min(1),
  ingredients: z.string().max(2000).default(""),
  usage: z.string().max(2000).default(""),
  warnings: z.string().max(2000).default(""),
  expiryNote: z.string().max(240).default(""),
  nafdacNumber: z.string().max(80).default(""),
  images: z.array(z.string()).max(3).default([]),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().min(1).max(40),
        name: z.string().min(1).max(80),
        priceKobo: z.number().int().min(100),
        compareKobo: z.number().int().min(0).default(0),
        stockOnHand: z.number().int().min(0).max(100000)
      })
    )
    .min(1)
    .max(24)
});

async function uniqueSlug(name: string, excludeId?: string) {
  const base = shopSlug(name);
  let slug = base;
  let n = 1;
  while (true) {
    const hit = await prisma.shopProduct.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

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
    return NextResponse.json({ products, categories });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendorId } });
    if (vendor?.shopStatus !== "approved") return NextResponse.json({ error: "Product Store is not approved yet." }, { status: 403 });
    const body = productSchema.parse(await req.json());
    const images = shopProductImages(body.images);
    if (!images.length) return NextResponse.json({ error: "Upload a featured product image." }, { status: 400 });
    const slug = await uniqueSlug(body.name, body.id);
    if (body.id) {
      const existing = await prisma.shopProduct.findFirst({ where: { id: body.id, vendorId: user.vendorId } });
      if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      const material = existing.status === "approved";
      const product = await prisma.$transaction(async (tx) => {
        const updated = await tx.shopProduct.update({
          where: { id: existing.id },
          data: {
            name: body.name,
            description: body.description,
            categoryId: body.categoryId,
            ingredients: body.ingredients,
            usage: body.usage,
            warnings: body.warnings,
            expiryNote: body.expiryNote,
            nafdacNumber: body.nafdacNumber,
            seoTitle: body.seoTitle,
            metaDescription: body.metaDescription,
            slug,
            status: material ? "pending" : existing.status === "rejected" ? "pending" : existing.status
          }
        });
        await tx.shopProductImage.deleteMany({ where: { productId: updated.id } });
        for (const [i, url] of images.entries()) {
          await tx.shopProductImage.create({ data: { productId: updated.id, url, sortOrder: i } });
        }
        const keep = body.variants.map((v) => v.id).filter(Boolean) as string[];
        await tx.shopProductVariant.updateMany({
          where: { productId: updated.id, id: { notIn: keep } },
          data: { active: false }
        });
        for (const variant of body.variants) {
          if (variant.id) {
            await tx.shopProductVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku,
                name: variant.name,
                priceKobo: variant.priceKobo,
                compareKobo: variant.compareKobo,
                stockOnHand: variant.stockOnHand,
                active: true
              }
            });
          } else {
            await tx.shopProductVariant.create({
              data: {
                productId: updated.id,
                sku: variant.sku,
                name: variant.name,
                priceKobo: variant.priceKobo,
                compareKobo: variant.compareKobo,
                stockOnHand: variant.stockOnHand
              }
            });
          }
        }
        return updated;
      });
      return NextResponse.json({ product });
    }
    const product = await prisma.shopProduct.create({
      data: {
        vendorId: user.vendorId,
        categoryId: body.categoryId,
        slug,
        name: body.name,
        description: body.description,
        ingredients: body.ingredients,
        usage: body.usage,
        warnings: body.warnings,
        expiryNote: body.expiryNote,
        nafdacNumber: body.nafdacNumber,
        seoTitle: body.seoTitle,
        metaDescription: body.metaDescription,
        status: "pending",
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
        variants: {
          create: body.variants.map((variant) => ({
            sku: variant.sku,
            name: variant.name,
            priceKobo: variant.priceKobo,
            compareKobo: variant.compareKobo,
            stockOnHand: variant.stockOnHand
          }))
        }
      }
    });
    return NextResponse.json({ product });
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
