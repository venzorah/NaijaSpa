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
    const result = await initPayment({
      email: user.email,
      amountKobo: booking.customerTotalKobo,
      purpose: "booking",
      bookingId: booking.id
    });
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}
