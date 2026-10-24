import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("campaigns.manage");
    const { id } = await params;
    const before = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    const body = z.object({ active: z.boolean().optional(), priority: z.number().int().optional() }).parse(await req.json());
    const campaign = await prisma.campaign.update({ where: { id }, data: body });
    await audit({ actorId: actor.id, action: "campaign.update", entityType: "Campaign", entityId: id, before, after: campaign });
    return NextResponse.json({ campaign });
  } catch (e) {
    return jsonError(e);
  }
}
