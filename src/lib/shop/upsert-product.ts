import { z } from "zod";
import { prisma } from "@/lib/db";
import { shopSlug } from "@/lib/shop/slug";
import { shopProductImages } from "@/lib/shop/product-media";

export const shopProductWriteSchema = z.object({
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

export type ShopProductWrite = z.infer<typeof shopProductWriteSchema>;

export function shopProductEditStatus(current: string): "pending" | "approved" {
  return current === "approved" ? "approved" : "pending";
}

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

export async function upsertShopProduct(vendorId: string, body: ShopProductWrite, status: "pending" | "approved") {
  const images = shopProductImages(body.images);
  if (!images.length) {
    const err = new Error("Upload a featured product image.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const slug = await uniqueSlug(body.name, body.id);
  if (body.id) {
    const existing = await prisma.shopProduct.findFirst({ where: { id: body.id, vendorId } });
    if (!existing) {
      const err = new Error("Product not found");
      (err as Error & { status: number }).status = 404;
      throw err;
    }
    return prisma.$transaction(async (tx) => {
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
          status
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
  }
  return prisma.shopProduct.create({
    data: {
      vendorId,
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
      status,
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
}
