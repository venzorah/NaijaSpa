import crypto from "crypto";
import { prisma } from "./db";
import { confirmBookingFromPayment } from "./booking";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export async function initPayment(input: {
  email: string;
  amountKobo: number;
  purpose: "booking" | "subscription" | "membership";
  bookingId?: string;
  metadata?: Record<string, string>;
}) {
  const reference = `NS-${input.purpose}-${crypto.randomBytes(8).toString("hex")}`;
  const payment = await prisma.payment.create({
    data: {
      bookingId: input.bookingId,
      provider: paystackConfigured() ? "paystack" : "unconfigured",
      purpose: input.purpose,
      amountKobo: input.amountKobo,
      currency: "NGN",
      status: "initialized",
      reference,
      idempotencyKey: reference
    }
  });

  if (!paystackConfigured()) {
    return {
      payment,
      authorizationUrl: null,
      blocked: true,
      message: "PAYSTACK_SECRET_KEY is not configured. Payment was recorded as initialized only and will not be confirmed."
    };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference,
      callback_url: `${process.env.APP_URL}/checkout/verify?reference=${reference}`,
      metadata: input.metadata ?? {}
    })
  });
  const data = await res.json();
  if (!data.status) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", rawPayload: JSON.stringify(data) } });
    throw Object.assign(new Error(data.message || "Paystack initialize failed"), { status: 502 });
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "pending", providerRef: data.data.access_code, rawPayload: JSON.stringify({ access_code: data.data.access_code }) }
  });
  return { payment, authorizationUrl: data.data.authorization_url as string, blocked: false };
}

export async function verifyPaystack(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) throw Object.assign(new Error("Unknown payment"), { status: 404 });
  if (payment.status === "success") return payment;

  if (!paystackConfigured()) {
    return payment;
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const data = await res.json();
  if (data.status && data.data?.status === "success") {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "success", providerRef: String(data.data.id), rawPayload: JSON.stringify({ id: data.data.id, status: data.data.status }) }
    });
    if (payment.bookingId) await confirmBookingFromPayment(payment.bookingId);
    return updated;
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
  return payment;
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
