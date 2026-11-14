import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  DEFAULT_REFUND_POLICY,
  parseRefundPolicy,
  quoteCancellationRefund,
  REFUND_CONFIG_KEY,
  toStoredRefundStatus,
  type RefundPolicy,
  type RefundQuoteKind
} from "./refund-policy";

function paystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw Object.assign(new Error("Paystack is not configured"), { status: 503 });
  return key;
}

export async function getRefundPolicy(): Promise<RefundPolicy> {
  const row = await prisma.systemConfig.findUnique({ where: { key: REFUND_CONFIG_KEY } });
  return parseRefundPolicy(row?.value);
}

type Db = Prisma.TransactionClient | typeof prisma;

async function cancelPendingEarning(client: Db, bookingId: string) {
  await client.vendorEarning.updateMany({
    where: { bookingId, status: "pending" },
    data: { status: "cancelled" }
  });
}

export async function paidBookingPayment(client: Db, bookingId: string) {
  const booking = await client.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  return client.payment.findFirst({
    where: {
      bookingId,
      status: "success",
      purpose: "booking",
      amountKobo: booking.customerTotalKobo,
      currency: booking.currency
    },
    include: { refunds: true }
  });
}

async function processedRefundedKobo(paymentId: string, client: Db) {
  const rows = await client.refund.findMany({
    where: { paymentId, status: { in: ["processed", "submitting"] } },
    select: { amountKobo: true, status: true }
  });
  return rows.reduce((sum, row) => sum + (row.status === "processed" || row.status === "submitting" ? row.amountKobo : 0), 0);
}

export async function queuePaidBookingRefund(input: {
  bookingId: string;
  reason: string;
  actorId?: string;
  kind?: RefundQuoteKind;
  autoSend?: boolean;
  amountKobo?: number;
  penaltyKobo?: number;
  client?: Db;
}) {
  const run = async (client: Db) => {
    const policy = await getRefundPolicy();
    const booking = await client.booking.findUnique({
      where: { id: input.bookingId },
      include: { earning: true }
    });
    if (!booking) return null;
    const payment = await paidBookingPayment(client, booking.id);
    if (!payment) return null;

    const quote = quoteCancellationRefund(
      policy,
      booking.customerTotalKobo,
      booking.startsAt,
      new Date(),
      input.kind || "cancel"
    );
    const already = await processedRefundedKobo(payment.id, client);
    const remaining = Math.max(0, payment.amountKobo - already);
    const inFlight = payment.refunds.find((row) => row.status === "submitting");
    if (inFlight) {
      return { refund: inFlight, bookingId: booking.id, refundKobo: inFlight.amountKobo, policy, earningPaid: booking.earning?.status === "paid" };
    }
    if (remaining <= 0) {
      const done = payment.refunds.find((row) => row.status === "processed") || payment.refunds[0];
      if (!done) return null;
      return { refund: done, bookingId: booking.id, refundKobo: 0, policy, earningPaid: booking.earning?.status === "paid" };
    }
    let refundKobo =
      input.amountKobo != null ? Math.round(input.amountKobo) : quote.refundKobo;
    refundKobo = Math.max(0, Math.min(remaining, refundKobo));
    const penaltyKobo =
      input.penaltyKobo != null ? Math.max(0, Math.round(input.penaltyKobo)) : Math.max(0, booking.customerTotalKobo - refundKobo);

    const open = payment.refunds.find((row) => ["pending", "failed"].includes(row.status));
    const refund = open
      ? await client.refund.update({
          where: { id: open.id },
          data: {
            amountKobo: refundKobo,
            penaltyKobo,
            reason: input.reason,
            status: refundKobo <= 0 ? "rejected" : open.status === "submitting" ? "submitting" : "pending"
          }
        })
      : await client.refund.create({
          data: {
            paymentId: payment.id,
            bookingId: booking.id,
            amountKobo: refundKobo,
            penaltyKobo,
            reason: input.reason,
            status: refundKobo <= 0 ? "rejected" : "pending"
          }
        });

    const toStatus = refundKobo > 0 ? "refund_pending" : "cancelled";
    if (booking.status !== "refunded" && booking.status !== toStatus) {
      await client.booking.update({
        where: { id: booking.id },
        data: {
          status: toStatus,
          cancelReason: input.reason,
          statusHistory: {
            create: { fromStatus: booking.status, toStatus, actorId: input.actorId, note: input.reason }
          }
        }
      });
    }
    await cancelPendingEarning(client, booking.id);
    return { refund, bookingId: booking.id, refundKobo, policy, earningPaid: booking.earning?.status === "paid" };
  };

  const result = input.client ? await run(input.client) : await prisma.$transaction((tx) => run(tx));
  if (
    result &&
    result.refundKobo > 0 &&
    input.autoSend &&
    result.policy.paystackRefundsEnabled &&
    result.policy.adminRefundsEnabled &&
    !result.earningPaid
  ) {
    try {
      await sendPaystackRefund(result.refund.id, input.actorId);
    } catch (err) {
      console.error("[refund] auto send failed", err);
    }
  }
  return result;
}

export async function sendPaystackRefund(refundId: string, actorId?: string) {
  const policy = await getRefundPolicy();
  if (!policy.paystackRefundsEnabled || !policy.adminRefundsEnabled) {
    throw Object.assign(new Error("Paystack refunds are turned off in Finance → Refund policy."), { status: 409 });
  }
  paystackKey();
  const refund = await prisma.refund.findUniqueOrThrow({
    where: { id: refundId },
    include: {
      payment: true,
      booking: { include: { earning: true } }
    }
  });
  if (refund.amountKobo <= 0) {
    throw Object.assign(new Error("This refund amount is ₦0. Raise the refund or lower the penalty."), { status: 400 });
  }
  if (refund.status === "processed") return refund;
  if (refund.booking?.earning?.status === "paid") {
    throw Object.assign(new Error("Vendor payout already went out. Reverse or hold that payout before refunding the customer."), {
      status: 409
    });
  }
  await prisma.refund.update({ where: { id: refund.id }, data: { status: "submitting" } });
  const res = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transaction: refund.payment.reference,
      amount: refund.amountKobo,
      currency: refund.payment.currency || "NGN",
      merchant_note: refund.reason || "NaijaSpa booking refund"
    })
  });
  const payload = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { id?: number; status?: string };
  };
  if (!payload.status) {
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: "failed", rawPayload: JSON.stringify(payload).slice(0, 4000) }
    });
    throw Object.assign(new Error(payload.message || "Paystack rejected the refund."), { status: 502 });
  }
  const providerStatus = payload.data?.status || "";
  const processed = providerStatus === "processed";
  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: processed ? "processed" : "submitting",
      providerRef: payload.data?.id != null ? String(payload.data.id) : refund.providerRef,
      rawPayload: JSON.stringify(payload.data || payload).slice(0, 4000),
      processedAt: processed ? new Date() : null
    }
  });
  if (processed) await finalizeProcessedRefund(updated.id, actorId);
  else if (refund.bookingId) {
    await prisma.booking.update({
      where: { id: refund.bookingId },
      data: { status: "refund_pending" }
    });
    await cancelPendingEarning(prisma, refund.bookingId);
  }
  return updated;
}

async function finalizeProcessedRefund(refundId: string, actorId?: string, note?: string) {
  const refund = await prisma.refund.findUniqueOrThrow({
    where: { id: refundId },
    include: { payment: true, booking: { select: { id: true, status: true, customerId: true } } }
  });
  const processed = await prisma.refund.aggregate({
    where: { paymentId: refund.paymentId, status: "processed" },
    _sum: { amountKobo: true }
  });
  const refundedKobo = processed._sum.amountKobo ?? 0;
  if (refundedKobo >= refund.payment.amountKobo) {
    await prisma.payment.update({ where: { id: refund.paymentId }, data: { status: "refunded" } });
  }
  if (refund.bookingId) {
    if (refund.booking?.status !== "refunded") {
      await prisma.booking.update({
        where: { id: refund.bookingId },
        data: {
          status: "refunded",
          statusHistory: {
            create: {
              fromStatus: refund.booking?.status || "refund_pending",
              toStatus: "refunded",
              actorId,
              note: note || refund.reason
            }
          }
        }
      });
      if (refund.booking) {
        await prisma.notification.create({
          data: {
            userId: refund.booking.customerId,
            title: "Refund sent",
            actionUrl: `/account/bookings/${refund.bookingId}`,
            body: note?.includes("manual")
              ? "NaijaSpa recorded your refund. It may already be in your bank or wallet."
              : "Your NaijaSpa refund is on the way to the original payment method. Paystack usually completes this in a few working days."
          }
        });
      }
    }
    await cancelPendingEarning(prisma, refund.bookingId);
  }
}

export async function setManualRefundStatus(input: {
  refundId: string;
  status: string;
  actorId: string;
  reason?: string;
  amountKobo?: number;
  penaltyKobo?: number;
}) {
  const stored = toStoredRefundStatus(input.status);
  const refund = await prisma.refund.findUniqueOrThrow({
    where: { id: input.refundId },
    include: { payment: true }
  });
  const reason = input.reason?.trim() || refund.reason;
  await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: stored,
      reason,
      ...(input.amountKobo != null ? { amountKobo: input.amountKobo } : {}),
      ...(input.penaltyKobo != null ? { penaltyKobo: input.penaltyKobo } : {}),
      processedAt: stored === "processed" ? new Date() : null,
      providerRef: stored === "processed" && !refund.providerRef ? "manual" : refund.providerRef
    }
  });
  if (stored === "processed") {
    await finalizeProcessedRefund(refund.id, input.actorId, `${reason || "Refund completed"} (manual)`);
    return prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
  }
  const stillRefunded = await prisma.refund.aggregate({
    where: { paymentId: refund.paymentId, status: "processed" },
    _sum: { amountKobo: true }
  });
  if (refund.payment.status === "refunded" && (stillRefunded._sum.amountKobo ?? 0) < refund.payment.amountKobo) {
    await prisma.payment.update({ where: { id: refund.paymentId }, data: { status: "success" } });
  }
  if (refund.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: refund.bookingId }, select: { status: true } });
    const toStatus = stored === "rejected" ? "cancelled" : "refund_pending";
    if (booking && booking.status !== toStatus) {
      await prisma.booking.update({
        where: { id: refund.bookingId },
        data: {
          status: toStatus,
          cancelReason: reason,
          statusHistory: {
            create: { fromStatus: booking.status, toStatus, actorId: input.actorId, note: reason }
          }
        }
      });
    }
    if (stored === "rejected") await cancelPendingEarning(prisma, refund.bookingId);
  }
  return prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
}

export async function rejectRefund(refundId: string, actorId: string, reason: string) {
  return setManualRefundStatus({ refundId, status: "rejected", actorId, reason });
}

export async function applyPaystackRefundEvent(event: string, data: Record<string, unknown>) {
  if (!event.startsWith("refund.") && event !== "charge.refunded") return null;
  const transaction = (data.transaction && typeof data.transaction === "object" ? data.transaction : {}) as {
    reference?: string;
    id?: number;
  };
  const reference = String(transaction.reference || data.transaction_reference || "");
  const providerId = data.id != null ? String(data.id) : "";
  const refund =
    (providerId
      ? await prisma.refund.findFirst({ where: { providerRef: providerId } })
      : null) ||
    (reference
      ? await prisma.refund.findFirst({
          where: { payment: { reference } },
          orderBy: { createdAt: "desc" }
        })
      : null);
  if (!refund) return null;
  const failed = event === "refund.failed" || String(data.status) === "failed";
  if (failed) {
    return prisma.refund.update({
      where: { id: refund.id },
      data: { status: "failed", rawPayload: JSON.stringify(data).slice(0, 4000) }
    });
  }
  const done =
    event === "refund.processed" || event === "charge.refunded" || String(data.status) === "processed";
  if (!done) {
    return prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: "submitting",
        providerRef: providerId || refund.providerRef,
        rawPayload: JSON.stringify(data).slice(0, 4000)
      }
    });
  }
  await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: "processed",
      providerRef: providerId || refund.providerRef,
      processedAt: new Date(),
      rawPayload: JSON.stringify(data).slice(0, 4000)
    }
  });
  await finalizeProcessedRefund(refund.id);
  return prisma.refund.findUnique({ where: { id: refund.id } });
}

export { DEFAULT_REFUND_POLICY, parseRefundPolicy, quoteCancellationRefund, REFUND_CONFIG_KEY };
export type { RefundPolicy };
