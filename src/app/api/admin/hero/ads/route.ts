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
  title: z.string().min(1).max(80),
  body: z.string().max(280).optional().default(""),
  imageUrl: z.string().min(1).max(500),
  ctaLabel: z.string().min(1).max(40).optional().default("View vendor"),
  ctaHref: z.string().min(1).max(240),
  sortOrder: z.number().int().min(0).max(99).optional().default(0),
  active: z.boolean().optional().default(true)
});

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "cms.manage");
    const body = adBody.parse(await req.json());
    const vendorId = body.vendorId || null;
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    const ad = await prisma.heroAd.create({
      data: {
        vendorId,
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
      action: "heroAd.create",
      entityType: "HeroAd",
      entityId: ad.id,
      after: sanitizeHeroAd({ ...ad, vendorName: null })
    });
    return NextResponse.json({ ad });
  } catch (e) {
    return jsonError(e);
  }
}
