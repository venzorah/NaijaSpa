import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("users.manage");
    const { id } = await params;
    const body = z
      .object({
        status: z.enum(["active", "suspended"]).optional(),
        processDeletion: z.boolean().optional(),
        note: z.string().optional()
      })
      .parse(await req.json());
    const before = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (before.role !== "customer") return NextResponse.json({ error: "Only customer accounts can be changed here" }, { status: 400 });
    const data: { status?: string; name?: string; email?: string; phone?: string | null; deletionRequestedAt?: Date | null } = {};
    if (body.status) data.status = body.status;
    if (body.processDeletion) {
      data.name = "Deleted customer";
      data.email = `deleted-${id.slice(-8)}@redacted.naijaspa`;
      data.phone = null;
      data.deletionRequestedAt = null;
      data.status = "suspended";
    }
    const user = await prisma.user.update({ where: { id }, data });
    await audit({
      actorId: actor.id,
      action: body.processDeletion ? "user.delete_personal_data" : body.status === "suspended" ? "user.suspend" : "user.update",
      entityType: "User",
      entityId: id,
      before,
      after: { ...user, note: body.note }
    });
    return NextResponse.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}
