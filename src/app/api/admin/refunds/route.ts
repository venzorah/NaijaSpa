import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/rbac";
import { queuePaidBookingRefund, sendPaystackRefund } from "@/lib/refunds";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(["finance.manage", "bookings.manage"]);
    const body = z
      .object({
        bookingId: z.string().min(1),
        amountKobo: z.number().int().nonnegative().optional(),
        penaltyKobo: z.number().int().nonnegative().optional(),
        reason: z.string().trim().min(3).max(300),
        send: z.boolean().optional()
      })
      .parse(await req.json());
    const queued = await queuePaidBookingRefund({
      bookingId: body.bookingId,
      reason: body.reason,
      actorId: actor.id,
      kind: "cancel",
      amountKobo: body.amountKobo,
      penaltyKobo: body.penaltyKobo,
      autoSend: false
    });
    if (!queued?.refund) {
      throw Object.assign(new Error("No successful booking payment to refund."), { status: 404 });
    }
    if (body.send && !hasPermission(actor, "finance.manage")) {
      throw Object.assign(new Error("Only finance admins can send money through Paystack."), { status: 403 });
    }
    const refund = body.send && queued.refundKobo > 0 ? await sendPaystackRefund(queued.refund.id, actor.id) : queued.refund;
    await audit({
      actorId: actor.id,
      action: body.send ? "refund.send" : "refund.queue",
      entityType: "Refund",
      entityId: refund.id,
      after: refund
    });
    return NextResponse.json({ refund });
  } catch (e) {
    return jsonError(e);
  }
}
