import crypto from "crypto";
import { prisma } from "./db";
import { confirmBookingFromPayment } from "./booking";
import { canonicalVendorPlanCode } from "./vendor-plans";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function paystackPublicKey() {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "";
}

export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function paystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw Object.assign(new Error("Paystack is not configured"), { status: 503 });
  return key;
}

function webhookSecret() {
  return process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";
}

export async function initPayment(input: {
  email: string;
  amountKobo: number;
  purpose: "booking" | "subscription" | "membership";
  bookingId?: string;
  customerId?: string;
  callbackPath?: string;
  metadata?: Record<string, string>;
}) {
  if (input.purpose === "membership") {
    throw Object.assign(new Error("Customer memberships are not offered."), { status: 410 });
  }
  if (input.amountKobo < 100) {
    throw Object.assign(new Error("Amount is too small to charge"), { status: 400 });
  }

  if (input.bookingId) {
    const paid = await prisma.payment.findFirst({
      where: { bookingId: input.bookingId, status: "success" }
    });
    if (paid) {
      const fulfilled = await markPaymentSuccess(paid.id, paid.bookingId, paid.providerRef || paid.reference);
      return {
        payment: fulfilled,
        authorizationUrl: null as string | null,
        accessCode: null as string | null,
        publicKey: paystackPublicKey(),
        alreadyPaid: true,
        blocked: false,
        message: "This booking is already paid."
      };
    }
    const pending = await prisma.payment.findFirst({
      where: {
        bookingId: input.bookingId,
        amountKobo: input.amountKobo,
        status: "pending",
        provider: "paystack"
      },
      orderBy: { createdAt: "desc" }
    });
    if (pending?.providerRef) {
      return {
        payment: pending,
        authorizationUrl: `https://checkout.paystack.com/${pending.providerRef}`,
        accessCode: pending.providerRef,
        publicKey: paystackPublicKey(),
        alreadyPaid: false,
        blocked: false,
        message: null
      };
    }
  }

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
      idempotencyKey: reference,
      rawPayload: JSON.stringify({ metadata: input.metadata ?? {} })
    }
  });

  if (!paystackConfigured()) {
    return {
      payment,
      authorizationUrl: null,
      accessCode: null,
      publicKey: "",
      alreadyPaid: false,
      blocked: true,
      message:
        "Paystack keys are not set. Add PAYSTACK_SECRET_KEY (and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) on this host to collect payment."
    };
  }

  const callbackPath = input.callbackPath || "/checkout/verify";
  const callback = `${appUrl()}${callbackPath}${callbackPath.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}`;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference,
      callback_url: callback,
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
      metadata: {
        bookingId: input.bookingId ?? "",
        purpose: input.purpose,
        customerId: input.customerId ?? "",
        cancel_action: input.bookingId ? `${appUrl()}/checkout/${input.bookingId}` : callback,
        ...(input.metadata ?? {})
      }
    })
  });
  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!data.status || !data.data?.authorization_url) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", rawPayload: JSON.stringify(data) }
    });
    throw Object.assign(new Error(data.message || "Paystack initialize failed"), { status: 502 });
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "pending",
      providerRef: data.data.access_code,
      rawPayload: JSON.stringify({ access_code: data.data.access_code, metadata: input.metadata ?? {} })
    }
  });

  return {
    payment: updated,
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code ?? null,
    publicKey: paystackPublicKey(),
    alreadyPaid: false,
    blocked: false,
    message: null as string | null
  };
}

async function markPaymentSuccess(paymentId: string, bookingId: string | null, providerRef: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "success", providerRef }
    });
    if (bookingId) await confirmBookingFromPayment(bookingId, undefined, tx);
    if (payment.purpose === "subscription") await fulfillVendorSubscriptionPayment(payment.id, tx);
    return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });
}

function paymentMetadata(raw: string | null): { vendorId?: string; planCode?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { metadata?: { vendorId?: string; planCode?: string }; vendorId?: string; planCode?: string };
    return parsed.metadata ?? parsed;
  } catch {
    return {};
  }
}

async function fulfillVendorSubscriptionPayment(paymentId: string, tx: import("@prisma/client").Prisma.TransactionClient) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.purpose !== "subscription" || payment.subscriptionId) return;
  const meta = paymentMetadata(payment.rawPayload);
  if (!meta.vendorId || !meta.planCode) throw new Error("Missing subscription payment metadata");
  await tx.$queryRaw`SELECT id FROM "Vendor" WHERE id = ${meta.vendorId} FOR NO KEY UPDATE`;
  const plan = await tx.subscriptionPlan.findUnique({ where: { code: canonicalVendorPlanCode(meta.planCode) } });
  if (!plan) throw new Error("Purchased listing plan no longer exists");
  const at = new Date();
  await tx.vendorSubscription.updateMany({
    where: { vendorId: meta.vendorId, status: { in: ["active", "grace"] } }, data: { status: "expired" }
  });
  const sub = await tx.vendorSubscription.create({ data: {
    vendorId: meta.vendorId, planId: plan.id, status: "active", source: "paystack", startsAt: at,
    endsAt: plan.code === "FREE" || plan.durationDays >= 3650
      ? new Date("9999-12-31") : new Date(at.getTime() + plan.durationDays * 86_400_000)
  } });
  await tx.payment.update({ where: { id: payment.id }, data: { subscriptionId: sub.id } });
}

export async function verifyPaystack(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) throw Object.assign(new Error("Unknown payment"), { status: 404 });
  if (payment.status === "success") return markPaymentSuccess(payment.id, payment.bookingId, payment.providerRef || reference);
  if (!paystackConfigured()) return payment;

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecret()}` }
  });
  const data = (await res.json()) as {
    status?: boolean;
    data?: { id?: number; status?: string; amount?: number; currency?: string; reference?: string };
  };
  const tx = data.data;
  const paid =
    Boolean(data.status) &&
    tx?.status === "success" &&
    tx.amount === payment.amountKobo &&
    tx.currency === payment.currency && tx.reference === reference;

  if (paid) {
    return markPaymentSuccess(payment.id, payment.bookingId, String(tx?.id ?? reference));
  }

  await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: "success" } },
    data: { status: "failed" }
  });
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

export async function applyChargeSuccess(reference: string, providerId: string | undefined, amountKobo: number | undefined, currency: string | undefined) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return null;
  if (payment.amountKobo !== amountKobo || payment.currency !== currency) {
    throw Object.assign(new Error("Payment amount or currency mismatch"), { status: 400 });
  }
  return markPaymentSuccess(payment.id, payment.bookingId, String(providerId ?? reference));
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = webhookSecret();
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
