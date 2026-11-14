import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { markBookingCompleted } from "@/lib/payouts";
import { confirmBookingFromPayment } from "@/lib/booking";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVendor();
    const { id } = await params;
    const body = z.object({ status: z.enum(["confirmed", "completed", "cancelled", "no_show", "in_progress"]) }).parse(await req.json());
    const existing = await prisma.booking.findFirst({ where: { id, vendorId: user.vendorId } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (body.status === "completed") {
      const booking = await markBookingCompleted(id, user.id);
      return NextResponse.json({ booking });
    }
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id } });
      if (body.status === "confirmed") return confirmBookingFromPayment(id, user.id, tx);
      const allowed: Record<string, string[]> = {
        pending: ["cancelled"], awaiting_payment: ["cancelled"],
        confirmed: ["in_progress", "cancelled", "no_show"],
        in_progress: ["no_show"], cancellation_requested: ["cancelled"]
      };
      if (!allowed[current.status]?.includes(body.status)) {
        throw Object.assign(new Error("Invalid booking status transition"), { status: 409 });
      }
      return tx.booking.update({ where: { id }, data: { status: body.status,
        statusHistory: { create: { fromStatus: current.status, toStatus: body.status, actorId: user.id } }
      } });
    });
    if (body.status === "cancelled" || body.status === "no_show") {
      const { getRefundPolicy, queuePaidBookingRefund } = await import("@/lib/refunds");
      const policy = await getRefundPolicy();
      if (policy.vendorCancelQueuesRefund) {
        await queuePaidBookingRefund({
          bookingId: id,
          reason: body.status === "no_show" ? "Marked no-show" : "Cancelled by therapist",
          actorId: user.id,
          kind: body.status === "no_show" ? "no_show" : "cancel",
          autoSend: policy.autoRefundOnCancel
        });
      }
    }
    return NextResponse.json({ booking: await prisma.booking.findUnique({ where: { id } }) });
  } catch (e) {
    return jsonError(e);
  }
}
