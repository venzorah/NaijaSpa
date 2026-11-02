import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { campaignFields, assertCampaignWindow } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("campaigns.manage");
    const body = campaignFields.parse(await req.json());
    const startsAt = new Date(body.startsAt), endsAt = new Date(body.endsAt);
    assertCampaignWindow(startsAt, endsAt);
    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId }, select: { id: true } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    if (body.serviceId && !await prisma.service.findFirst({ where: { id: body.serviceId, vendorId: body.vendorId }, select: { id: true } })) {
      return NextResponse.json({ error: "Choose a service belonging to this vendor." }, { status: 400 });
    }
    const campaign = await prisma.campaign.create({ data: { ...body, serviceId: body.serviceId ?? null, startsAt, endsAt } });
    await audit({ actorId: actor.id, action: "campaign.create", entityType: "Campaign", entityId: campaign.id, after: campaign });
    revalidateTag("home-catalog");
    return NextResponse.json({ campaign });
  } catch (error) { return jsonError(error); }
}
