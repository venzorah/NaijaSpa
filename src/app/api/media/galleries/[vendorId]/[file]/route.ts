import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { mediaUrl, resolveMediaPath } from "@/lib/gallery-media";
import { prisma } from "@/lib/db";
import { getMediaObject } from "@/lib/object-storage";
import { withVendorMediaHeaders } from "@/lib/seo-robots";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

export async function GET(_req: Request, ctx: { params: Promise<{ vendorId: string; file: string }> }) {
  const { vendorId, file } = await ctx.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(vendorId) || !/^[a-zA-Z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const resolved = resolveMediaPath([vendorId, file]);
  const asset = await prisma.mediaAsset.findUnique({
    where: { url: mediaUrl(vendorId, file) },
    select: { deletedAt: true, imagePayload: true, mime: true, byteSize: true }
  });
  if (asset?.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (asset?.imagePayload) {
    const body = Buffer.from(asset.imagePayload);
    return new NextResponse(body, {
      headers: withVendorMediaHeaders({
        "Content-Type": asset.mime || MIME[path.extname(file).slice(1).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(asset.byteSize || body.length),
        "Cache-Control": "public, max-age=31536000, immutable"
      })
    });
  }
  const fromDb = await prisma.therapistGalleryImage.findFirst({
    where: { url: mediaUrl(vendorId, file), gallery: { vendorId } },
    select: { payload: true, mimeType: true, byteSize: true }
  });
  if (fromDb?.payload) {
    const body = Buffer.from(fromDb.payload);
    return new NextResponse(body, {
      headers: withVendorMediaHeaders({
        "Content-Type": fromDb.mimeType || MIME[path.extname(file).slice(1).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(fromDb.byteSize || body.length),
        "Cache-Control": "public, max-age=31536000, immutable"
      })
    });
  }
  const fromService = !fromDb && file.startsWith("service-") ? await prisma.service.findFirst({ where: { vendorId, imageUrl: mediaUrl(vendorId, file) }, select: { id: true } }) : null;
  const fromShop = !fromDb && !fromService && file.startsWith("shop-")
    ? await prisma.shopProductImage.findFirst({ where: { url: mediaUrl(vendorId, file), product: { vendorId } }, select: { id: true } })
    : null;
  if (fromDb || fromService || fromShop || file.startsWith("shop-")) {
    try {
      const object = await getMediaObject(`galleries/${vendorId}/${file}`);
      if (object) return new NextResponse(object.bytes, { headers: withVendorMediaHeaders({ "Content-Type": object.mime, "Content-Length": String(object.bytes.length), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }) });
    } catch { return NextResponse.json({ error: "Media storage is temporarily unavailable" }, { status: 503 }); }
  }
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const info = await stat(resolved);
    if (!info.isFile()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ext = path.extname(resolved).slice(1).toLowerCase();
    const body = await readFile(resolved);
    return new NextResponse(body, {
      headers: withVendorMediaHeaders({
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable"
      })
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
