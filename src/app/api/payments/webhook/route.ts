import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments";
import { confirmBookingFromPayment } from "@/lib/booking";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event?: string; data?: { reference?: string; id?: string; status?: string } };
  const reference = event.data?.reference;
  if (!reference) return NextResponse.json({ ok: true });
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return NextResponse.json({ ok: true });
  if (payment.status === "success") return NextResponse.json({ ok: true, idempotent: true });
  if (event.event === "charge.success" && event.data?.status === "success") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "success", providerRef: String(event.data.id ?? reference) }
    });
    if (payment.bookingId) await confirmBookingFromPayment(payment.bookingId);
  }
  return NextResponse.json({ ok: true });
}
