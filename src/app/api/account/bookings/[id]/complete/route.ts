import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { markBookingCompleted } from "@/lib/payouts";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(await getSession());
    const { id } = await params;
    const booking = await prisma.booking.findFirst({ where: { id, customerId: user.id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const updated = await markBookingCompleted(id, user.id);
    return NextResponse.json({ booking: updated });
  } catch (e) {
    return jsonError(e);
  }
}
