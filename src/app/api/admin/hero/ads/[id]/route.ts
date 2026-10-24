import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { sanitizeHeroAd } from "@/lib/home-hero";

const adBody = z.object({
  vendorId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(80).optional(),
  body: z.string().max(280).optional(),
  imageUrl: z.string().min(1).max(500).optional(),
  ctaLabel: z.string().min(1).max(40).optional(),
  ctaHref: z.string().min(1).max(240).optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
  active: z.boolean().optional()
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "cms.manage");
    const { id } = await params;
    const existing = await prisma.heroAd.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    const body = adBody.parse(await req.json());
    if (body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    const ad = await prisma.heroAd.update({
      where: { id },
      data: {
        vendorId: body.vendorId === undefined ? undefined : body.vendorId,
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        ctaLabel: body.ctaLabel,
        ctaHref: body.ctaHref,
        sortOrder: body.sortOrder,
        active: body.active
      }
    });
    await audit({
      actorId: user.id,
      action: "heroAd.update",
      entityType: "HeroAd",
      entityId: ad.id,
      before: sanitizeHeroAd({ ...existing, vendorName: null }),
      after: sanitizeHeroAd({ ...ad, vendorName: null })
    });
    return NextResponse.json({ ad });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "cms.manage");
    const { id } = await params;
    const existing = await prisma.heroAd.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    await prisma.heroAd.delete({ where: { id } });
    await audit({
      actorId: user.id,
      action: "heroAd.delete",
      entityType: "HeroAd",
      entityId: id,
      before: sanitizeHeroAd({ ...existing, vendorName: null })
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
