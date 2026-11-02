import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertAnyPermission } from "@/lib/rbac";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { sanitizeHeroAd } from "@/lib/home-hero";
import { publicContentUrl } from "@/lib/public-content";

const adBody = z.object({
  vendorId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(80),
  body: z.string().max(280).optional().default(""),
  imageUrl: publicContentUrl,
  ctaLabel: z.string().min(1).max(40).optional().default("View vendor"),
  ctaHref: publicContentUrl,
  sortOrder: z.number().int().min(0).max(99).optional().default(0),
  active: z.boolean().optional().default(true)
});

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertAnyPermission(user.role, ["cms.manage", "campaigns.manage"]);
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
    revalidateTag("home-hero");
    revalidateTag("home-catalog");
    return NextResponse.json({ ad });
  } catch (e) {
    return jsonError(e);
  }
}
