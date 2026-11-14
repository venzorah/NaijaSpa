import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { rejectRefund, sendPaystackRefund, setManualRefundStatus } from "@/lib/refunds";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("finance.manage");
    const { id } = await params;
    const body = z
      .object({
        action: z.enum(["send", "reject", "status"]).default("status"),
        status: z.string().optional(),
        amountKobo: z.number().int().nonnegative().optional(),
        penaltyKobo: z.number().int().nonnegative().optional(),
        reason: z.string().trim().max(300).optional()
      })
      .parse(await req.json());
    const before = await prisma.refund.findUniqueOrThrow({ where: { id } });
    if (body.action === "reject") {
      const refund = await rejectRefund(id, actor.id, body.reason || "Rejected by admin");
      await audit({
        actorId: actor.id,
        action: "refund.reject",
        entityType: "Refund",
        entityId: id,
        before,
        after: refund
      });
      return NextResponse.json({ refund });
    }
    if (body.action === "send") {
      if (body.amountKobo != null || body.penaltyKobo != null || body.reason) {
        await prisma.refund.update({
          where: { id },
          data: {
            ...(body.amountKobo != null ? { amountKobo: body.amountKobo } : {}),
            ...(body.penaltyKobo != null ? { penaltyKobo: body.penaltyKobo } : {}),
            ...(body.reason ? { reason: body.reason } : {})
          }
        });
      }
      const refund = await sendPaystackRefund(id, actor.id);
      await audit({
        actorId: actor.id,
        action: "refund.send",
        entityType: "Refund",
        entityId: id,
        before,
        after: refund
      });
      return NextResponse.json({ refund });
    }
    const refund = await setManualRefundStatus({
      refundId: id,
      status: body.status || "pending",
      actorId: actor.id,
      reason: body.reason,
      amountKobo: body.amountKobo,
      penaltyKobo: body.penaltyKobo
    });
    await audit({
      actorId: actor.id,
      action: "refund.status",
      entityType: "Refund",
      entityId: id,
      before,
      after: refund
    });
    return NextResponse.json({ refund });
  } catch (e) {
    return jsonError(e);
  }
}
