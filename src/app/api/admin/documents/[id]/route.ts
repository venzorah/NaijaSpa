import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("vendors.verify");
    const { id } = await params;
    const before = await prisma.verificationDoc.findUniqueOrThrow({ where: { id } });
    const body = z.object({ status: z.enum(["submitted", "verified", "rejected"]), notes: z.string().optional() }).parse(await req.json());
    const doc = await prisma.verificationDoc.update({ where: { id }, data: { status: body.status, notes: body.notes } });
    await audit({ actorId: actor.id, action: "verification.update", entityType: "VerificationDoc", entityId: id, before, after: doc });
    return NextResponse.json({ doc });
  } catch (e) {
    return jsonError(e);
  }
}
