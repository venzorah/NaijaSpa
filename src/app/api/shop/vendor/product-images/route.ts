import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { saveGalleryImageFile, deleteGalleryImageFile } from "@/lib/gallery-media";
import { SHOP_PRODUCT_IMAGE_BYTES } from "@/lib/shop/product-media";

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendorId }, select: { shopStatus: true } });
    if (vendor?.shopStatus !== "approved") return NextResponse.json({ error: "Product Store is not approved yet." }, { status: 403 });
    const file = formImage(await req.formData());
    if (!file) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    if (file.size > SHOP_PRODUCT_IMAGE_BYTES) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await saveGalleryImageFile(user.vendorId, `shop-${randomUUID()}`, bytes);
    await prisma.mediaAsset.create({
      data: {
        url: saved.url,
        name: "Shop product photo",
        mime: saved.mime,
        byteSize: bytes.byteLength,
        imagePayload: saved.storage === "r2" ? null : Buffer.from(bytes),
        createdById: user.id
      }
    }).catch(async (error) => {
      await deleteGalleryImageFile(saved.url).catch(() => undefined);
      throw error;
    });
    return NextResponse.json({ url: saved.url, mime: saved.mime });
  } catch (e) {
    return jsonError(e);
  }
}
