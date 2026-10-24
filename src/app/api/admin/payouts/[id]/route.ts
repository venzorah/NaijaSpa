import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("finance.manage");
    const { id } = await params;
    const before = await prisma.payout.findUniqueOrThrow({ where: { id } });
    const body = z.object({ status: z.enum(["pending", "paid", "failed"]), note: z.string().optional() }).parse(await req.json());
    const payout = await prisma.payout.update({ where: { id }, data: { status: body.status, note: body.note } });
    await audit({ actorId: actor.id, action: "payout.update", entityType: "Payout", entityId: id, before, after: payout });
    return NextResponse.json({ payout });
  } catch (e) {
    return jsonError(e);
  }
}
