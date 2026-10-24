import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVendor();
    const { id } = await params;
    const body = z.object({ status: z.enum(["confirmed", "completed", "cancelled", "no_show", "in_progress"]) }).parse(await req.json());
    const existing = await prisma.booking.findFirst({ where: { id, vendorId: user.vendorId } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const booking = await prisma.booking.update({ where: { id }, data: { status: body.status } });
    await prisma.bookingStatusEvent.create({
      data: { bookingId: id, fromStatus: existing.status, toStatus: body.status, actorId: user.id }
    });
    return NextResponse.json({ booking });
  } catch (e) {
    return jsonError(e);
  }
}
