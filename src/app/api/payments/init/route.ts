import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initPayment } from "@/lib/payments";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const { bookingId } = z.object({ bookingId: z.string() }).parse(await req.json());
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.customerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "confirmed") {
      return NextResponse.json({ alreadyPaid: true, bookingId: booking.id, message: "This booking is already paid." });
    }
    if (booking.status !== "awaiting_payment" && booking.status !== "pending") {
      return NextResponse.json({ error: "This booking cannot be paid" }, { status: 400 });
    }
    const result = await initPayment({
      email: user.email,
      amountKobo: booking.customerTotalKobo,
      purpose: "booking",
      bookingId: booking.id,
      customerId: user.id
    });
    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      publicKey: result.publicKey,
      reference: result.payment.reference,
      amountKobo: result.payment.amountKobo,
      email: user.email,
      alreadyPaid: result.alreadyPaid,
      blocked: result.blocked,
      message: result.message
    });
  } catch (e) {
    return jsonError(e);
  }
}
