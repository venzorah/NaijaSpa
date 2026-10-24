import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { vendorEntitlement } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const campaigns = await prisma.campaign.findMany({
      where: { vendorId: user.vendorId },
      include: { service: { select: { name: true } } },
      orderBy: { startsAt: "desc" }
    });
    const ent = await vendorEntitlement(user.vendorId);
    return NextResponse.json({ campaigns, sponsoredEligible: ent.sponsoredEligible });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const ent = await vendorEntitlement(user.vendorId);
    if (!ent.sponsoredEligible) {
      return NextResponse.json({ error: "Sponsored listings need an eligible paid plan." }, { status: 403 });
    }
    const body = z
      .object({
        placement: z.string().min(2),
        serviceId: z.string().optional(),
        startsAt: z.string(),
        endsAt: z.string()
      })
      .parse(await req.json());
    if (body.serviceId) {
      const service = await prisma.service.findFirst({ where: { id: body.serviceId, vendorId: user.vendorId } });
      if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const campaign = await prisma.campaign.create({
      data: {
        vendorId: user.vendorId,
        serviceId: body.serviceId,
        placement: body.placement,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt)
      }
    });
    return NextResponse.json({ campaign });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = z.object({ id: z.string(), active: z.boolean() }).parse(await req.json());
    const existing = await prisma.campaign.findFirst({ where: { id: body.id, vendorId: user.vendorId } });
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const campaign = await prisma.campaign.update({ where: { id: body.id }, data: { active: body.active } });
    return NextResponse.json({ campaign });
  } catch (e) {
    return jsonError(e);
  }
}
