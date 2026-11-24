import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { deleteGalleryImageFile, saveGalleryImageFile } from "@/lib/gallery-media";
import { SHOP_PRODUCT_IMAGE_BYTES } from "@/lib/shop/product-media";

export async function saveShopProductPhoto(vendorId: string, userId: string, file: { size: number; arrayBuffer: () => Promise<ArrayBuffer> }) {
  if (file.size > SHOP_PRODUCT_IMAGE_BYTES) {
    const err = new Error("Image must be 2 MB or smaller.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const saved = await saveGalleryImageFile(vendorId, `shop-${randomUUID()}`, bytes);
  await prisma.mediaAsset
    .create({
      data: {
        url: saved.url,
        name: "Shop product photo",
        mime: saved.mime,
        byteSize: bytes.byteLength,
        imagePayload: saved.storage === "r2" ? null : Buffer.from(bytes),
        createdById: userId
      }
    })
    .catch(async (error) => {
      await deleteGalleryImageFile(saved.url).catch(() => undefined);
      throw error;
    });
  return { url: saved.url, mime: saved.mime };
}
