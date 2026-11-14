import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { markBookingCompleted } from "@/lib/payouts";
import { BOOKING_STATES, confirmBookingFromPayment } from "@/lib/booking";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("bookings.manage");
    const { id } = await params;
    const before = await prisma.booking.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        status: z.enum(BOOKING_STATES),
        reason: z.string().optional()
      })
      .parse(await req.json());
    const booking =
      body.status === "completed"
        ? await markBookingCompleted(id, actor.id)
        : body.status === "confirmed" ? await confirmBookingFromPayment(id, actor.id)
        : await prisma.booking.update({
            where: { id },
            data: { status: body.status, cancelReason: body.reason ?? before.cancelReason }
          });
    if (body.status !== "completed" && body.status !== "confirmed") {
      await prisma.bookingStatusEvent.create({
        data: { bookingId: id, fromStatus: before.status, toStatus: body.status, actorId: actor.id, note: body.reason }
      });
    }
    if (
      (body.status === "cancelled" || body.status === "no_show") &&
      !["cancelled", "refund_pending", "refunded"].includes(before.status)
    ) {
      const { queuePaidBookingRefund } = await import("@/lib/refunds");
      await queuePaidBookingRefund({
        bookingId: id,
        reason: body.reason || (body.status === "no_show" ? "Marked no-show" : "Cancelled by admin"),
        actorId: actor.id,
        kind: body.status === "no_show" ? "no_show" : "cancel",
        autoSend: false
      });
    }
    await audit({
      actorId: actor.id,
      action: `booking.${body.status}`,
      entityType: "Booking",
      entityId: id,
      before,
      after: booking
    });
    return NextResponse.json({ booking: await prisma.booking.findUnique({ where: { id } }) });
  } catch (e) {
    return jsonError(e);
  }
}
