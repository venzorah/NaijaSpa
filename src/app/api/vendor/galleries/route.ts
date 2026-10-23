import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { getGalleryConfig, prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import {
  assertCanCreateGallery,
  assertGalleryTitle,
  MAX_VENDOR_GALLERIES,
  videoLinksAllowed
} from "@/lib/galleries";
import { jsonError } from "@/lib/http";

function requireVendorId(user: { vendorId?: string | null }) {
  if (!user.vendorId) return null;
  return user.vendorId;
}

export async function GET() {
  try {
    const user = requireUser(await getSession());
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const [galleries, videoLinks, config, entitlement] = await Promise.all([
      prisma.therapistGallery.findMany({
        where: { vendorId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      prisma.vendorVideoLink.findMany({
        where: { vendorId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      getGalleryConfig(),
      vendorEntitlement(vendorId)
    ]);
    return NextResponse.json({
      galleries,
      videoLinks,
      config: { ...config, maxGalleries: MAX_VENDOR_GALLERIES },
      videoLinksAllowed: videoLinksAllowed(entitlement),
      planCode: entitlement.planCode
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const body = z.object({ title: z.string(), caption: z.string().max(240).optional() }).parse(await req.json());
    const title = assertGalleryTitle(body.title);
    const count = await prisma.therapistGallery.count({ where: { vendorId } });
    assertCanCreateGallery(count);
    const gallery = await prisma.therapistGallery.create({
      data: {
        vendorId,
        title,
        caption: body.caption?.trim() ?? "",
        sortOrder: count
      },
      include: { images: true }
    });
    return NextResponse.json({ gallery });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = requireUser(await getSession());
    const vendorId = requireVendorId(user);
    if (!vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const body = z
      .object({
        id: z.string(),
        title: z.string().optional(),
        caption: z.string().max(240).optional()
      })
      .parse(await req.json());
    const existing = await prisma.therapistGallery.findFirst({ where: { id: body.id, vendorId } });
    if (!existing) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const gallery = await prisma.therapistGallery.update({
      where: { id: existing.id },
      data: {
        title: body.title != null ? assertGalleryTitle(body.title) : undefined,
        caption: body.caption != null ? body.caption.trim() : undefined
      },
      include: { images: { orderBy: { sortOrder: "asc" } } }
    });
    return NextResponse.json({ gallery });
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
    const existing = await prisma.therapistGallery.findFirst({
      where: { id, vendorId },
      include: { images: true }
    });
    if (!existing) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const { deleteGalleryImageFile } = await import("@/lib/gallery-media");
    await prisma.therapistGallery.delete({ where: { id: existing.id } });
    await Promise.all(existing.images.map((img) => deleteGalleryImageFile(img.url)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
