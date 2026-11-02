import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { revalidateTag } from "next/cache";
import { campaignFields, assertCampaignWindow } from "@/lib/campaigns";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("campaigns.manage");
    const { id } = await params;
    const before = await prisma.campaign.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const body = campaignFields.partial().parse(await req.json());
    const vendorId = body.vendorId ?? before.vendorId;
    const serviceId = body.serviceId === undefined ? before.serviceId : body.serviceId;
    const startsAt = body.startsAt ? new Date(body.startsAt) : before.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : before.endsAt;
    assertCampaignWindow(startsAt, endsAt);
    if (body.vendorId && !await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    if (serviceId && !await prisma.service.findFirst({ where: { id: serviceId, vendorId }, select: { id: true } })) return NextResponse.json({ error: "Choose a service belonging to this vendor." }, { status: 400 });
    const campaign = await prisma.campaign.update({ where: { id }, data: { ...body, startsAt, endsAt } });
    await audit({ actorId: actor.id, action: "campaign.update", entityType: "Campaign", entityId: id, before, after: campaign });
    revalidateTag("home-catalog");
    return NextResponse.json({ campaign });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("campaigns.manage");
    const { id } = await params;
    const before = await prisma.campaign.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    await prisma.campaign.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "campaign.delete", entityType: "Campaign", entityId: id, before });
    revalidateTag("home-catalog");
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
