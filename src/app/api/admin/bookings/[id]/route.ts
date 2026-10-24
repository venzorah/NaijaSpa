import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("bookings.manage");
    const { id } = await params;
    const before = await prisma.booking.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        status: z.enum(["cancelled", "completed", "confirmed", "no_show"]),
        reason: z.string().optional()
      })
      .parse(await req.json());
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: body.status, cancelReason: body.reason ?? before.cancelReason }
    });
    await prisma.bookingStatusEvent.create({
      data: { bookingId: id, fromStatus: before.status, toStatus: body.status, actorId: actor.id, note: body.reason }
    });
    await audit({
      actorId: actor.id,
      action: `booking.${body.status}`,
      entityType: "Booking",
      entityId: id,
      before,
      after: booking
    });
    return NextResponse.json({ booking });
  } catch (e) {
    return jsonError(e);
  }
}
