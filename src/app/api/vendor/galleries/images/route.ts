import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { getGalleryConfig, prisma } from "@/lib/db";
import { assertCanAddImage, assertImageUrl, isProfileGalleryTitle } from "@/lib/galleries";
import { jsonError } from "@/lib/http";

function requireVendorId(user: { vendorId?: string | null }) {
  if (!user.vendorId) return null;
  return user.vendorId;
}

async function ownedGallery(vendorId: string, galleryId: string) {
  return prisma.therapistGallery.findFirst({
    where: { id: galleryId, vendorId },
    include: { images: true }
  });
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const contentType = req.headers.get("content-type") || "";
    const config = await getGalleryConfig();

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      const galleryId = String(fd.get("galleryId") || "");
      const caption = String(fd.get("caption") || "").slice(0, 160);
      const therapistName = String(fd.get("therapistName") || "").slice(0, 80);
      const file = fd.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
      const gallery = await ownedGallery(vendorId, galleryId);
      if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
      const buf = new Uint8Array(await file.arrayBuffer());
      assertCanAddImage(gallery.images.length, config, buf.byteLength, {
        profile: isProfileGalleryTitle(gallery.title)
      });
      const { randomUUID } = await import("node:crypto");
      const { saveGalleryImageFile } = await import("@/lib/gallery-media");
      const saved = await saveGalleryImageFile(vendorId, randomUUID(), buf);
      const image = await prisma.therapistGalleryImage.create({
        data: {
          galleryId: gallery.id,
          url: saved.url,
          caption,
          therapistName,
          byteSize: buf.byteLength,
          sortOrder: gallery.images.length
        }
      });
      return NextResponse.json({ image });
    }

    const body = z
      .object({
        galleryId: z.string(),
        url: z.string(),
        caption: z.string().max(160).optional(),
        therapistName: z.string().max(80).optional()
      })
      .parse(await req.json());
    const gallery = await ownedGallery(vendorId, body.galleryId);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    assertCanAddImage(gallery.images.length, config, 0, { profile: isProfileGalleryTitle(gallery.title) });
    const image = await prisma.therapistGalleryImage.create({
      data: {
        galleryId: gallery.id,
        url: assertImageUrl(body.url),
        caption: body.caption?.trim() ?? "",
        therapistName: body.therapistName?.trim() ?? "",
        byteSize: 0,
        sortOrder: gallery.images.length
      }
    });
    return NextResponse.json({ image });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = requireUser(await getSession());
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const id = new URL(req.url).searchParams.get("id") || "";
    const image = await prisma.therapistGalleryImage.findFirst({
      where: { id, gallery: { vendorId } }
    });
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    const { deleteGalleryImageFile } = await import("@/lib/gallery-media");
    await prisma.therapistGalleryImage.delete({ where: { id: image.id } });
    await deleteGalleryImageFile(image.url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
