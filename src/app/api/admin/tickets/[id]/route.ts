import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("support.manage");
    const { id } = await params;
    const before = await prisma.supportTicket.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
        internalNotes: z.string().optional(),
        reply: z.string().optional()
      })
      .parse(await req.json());
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: body.status,
        internalNotes: body.internalNotes,
        assigneeId: actor.id
      }
    });
    if (body.reply?.trim()) {
      await prisma.ticketMessage.create({
        data: { ticketId: id, authorId: actor.id, body: body.reply.trim(), internal: false }
      });
    }
    await audit({ actorId: actor.id, action: "ticket.update", entityType: "SupportTicket", entityId: id, before, after: ticket });
    return NextResponse.json({ ticket });
  } catch (e) {
    return jsonError(e);
  }
}
