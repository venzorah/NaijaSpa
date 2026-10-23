import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { verifyPaystack } from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const user = requireUser(await getSession());
    const reference = new URL(req.url).searchParams.get("reference");
    if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });
    const existing = await prisma.payment.findUnique({
      where: { reference },
      include: { booking: { select: { customerId: true, id: true, status: true } } }
    });
    if (!existing) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    if (existing.booking && existing.booking.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const payment = await verifyPaystack(reference);
    return NextResponse.json({
      status: payment.status,
      reference: payment.reference,
      bookingId: payment.bookingId,
      amountKobo: payment.amountKobo
    });
  } catch (e) {
    return jsonError(e);
  }
}
