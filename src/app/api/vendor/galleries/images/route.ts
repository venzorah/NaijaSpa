import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { getGalleryConfig, prisma } from "@/lib/db";
import { assertCanAddImage, assertImageUrl, GALLERY_IMAGE_LIST_SELECT, isProfileGalleryTitle } from "@/lib/galleries";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";

function requireVendorId(user: { vendorId?: string | null }) {
  if (!user.vendorId) return null;
  return user.vendorId;
}

async function ownedGallery(vendorId: string, galleryId: string) {
  return prisma.therapistGallery.findFirst({
    where: { id: galleryId, vendorId },
    include: { images: { select: GALLERY_IMAGE_LIST_SELECT } }
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const contentType = req.headers.get("content-type") || "";
    const config = await getGalleryConfig();

    if (!contentType.includes("application/json")) {
      const fd = await req.formData();
      const galleryId = String(fd.get("galleryId") || "");
      const caption = String(fd.get("caption") || "").slice(0, 160);
      const therapistName = String(fd.get("therapistName") || "").slice(0, 80);
      const file = formImage(fd);
      if (!file) return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
      if (file.size > config.maxImageBytes) return NextResponse.json({ error: "Image exceeds the upload size limit." }, { status: 400 });
      const gallery = await ownedGallery(vendorId, galleryId);
      if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
      const buf = new Uint8Array(await file.arrayBuffer());
      assertCanAddImage(gallery.images.length, config, buf.byteLength, {
        profile: isProfileGalleryTitle(gallery.title)
      });
      const { randomUUID } = await import("node:crypto");
      const { saveGalleryImageFile, deleteGalleryImageFile } = await import("@/lib/gallery-media");
      const saved = await saveGalleryImageFile(vendorId, randomUUID(), buf);
      const image = await prisma.therapistGalleryImage.create({
        data: {
          galleryId: gallery.id,
          url: saved.url,
          caption,
          therapistName,
          byteSize: buf.byteLength,
          payload: saved.storage === "r2" ? null : Buffer.from(buf),
          mimeType: saved.mime,
          sortOrder: gallery.images.length
        }
      }).catch(async (error) => {
        await deleteGalleryImageFile(saved.url).catch(() => console.error("Could not clean up an unlinked gallery upload"));
        throw error;
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
    const user = await requireVendor();
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const id = new URL(req.url).searchParams.get("id") || "";
    const image = await prisma.therapistGalleryImage.findFirst({
      where: { id, gallery: { vendorId } },
      select: { id: true, url: true }
    });
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    const profileUse = await prisma.vendor.count({ where: { OR: [{ coverUrl: image.url }, { logoUrl: image.url }] } });
    if (profileUse) return NextResponse.json({ error: "This photo is used as a business cover or logo. Choose a replacement in Business profile first." }, { status: 409 });
    const used = await prisma.service.count({ where: { imageUrl: image.url } });
    if (used) return NextResponse.json({ error: "This photo is a service's featured image. Replace or remove it from the service first." }, { status: 409 });
    const { deleteGalleryImageFile } = await import("@/lib/gallery-media");
    await deleteGalleryImageFile(image.url);
    await prisma.therapistGalleryImage.delete({ where: { id: image.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
