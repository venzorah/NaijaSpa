import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { deleteGalleryImageFile, saveGalleryImageFile } from "@/lib/gallery-media";
import { SHOP_PRODUCT_IMAGE_BYTES } from "@/lib/shop/product-media";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const fd = await req.formData();
    const target = String(fd.get("target") || "");
    if (target !== "logo" && target !== "cover") {
      return NextResponse.json({ error: "Choose a store profile or cover image." }, { status: 400 });
    }
    const file = formImage(fd);
    if (!file) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    if (file.size > SHOP_PRODUCT_IMAGE_BYTES) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await saveGalleryImageFile(user.vendorId, `shop-${target}-${randomUUID()}`, bytes);
    await prisma.mediaAsset
      .create({
        data: {
          url: saved.url,
          name: target === "logo" ? "Store profile image" : "Store cover image",
          mime: saved.mime,
          byteSize: bytes.byteLength,
          imagePayload: saved.storage === "r2" ? null : Buffer.from(bytes),
          createdById: user.id
        }
      })
      .catch(async (error) => {
        await deleteGalleryImageFile(saved.url).catch(() => undefined);
        throw error;
      });
    await prisma.vendor.update({
      where: { id: user.vendorId },
      data: target === "logo" ? { logoUrl: saved.url } : { coverUrl: saved.url }
    });
    revalidateTag("home-catalog");
    return NextResponse.json({ url: saved.url, target });
  } catch (e) {
    return jsonError(e);
  }
}
