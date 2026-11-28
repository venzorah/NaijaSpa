import crypto from "crypto";
import { prisma } from "@/lib/db";
import { paystackConfigured } from "@/lib/payments";
import {
  ensureVendorRecipient,
  maskAccountNumber,
  paystackJson,
  transferOutcome
} from "@/lib/payouts";
import { shopMinPayoutKobo } from "@/lib/shop/ensure";

export async function dueShopSettlements(vendorId: string) {
  return prisma.shopSettlement.findMany({
    where: {
      vendorId,
      status: { in: ["available", "held"] },
      availableAt: { lte: new Date() },
      payoutId: null
    }
  });
}

export async function payShopVendorBalance(vendorId: string) {
  const min = await shopMinPayoutKobo();
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: {
      id: true,
      payoutRecipientCode: true,
      payoutAccountNumber: true,
      payoutBankCode: true,
      payoutAccountName: true,
      payoutBankName: true
    }
  });
  const due = await dueShopSettlements(vendorId);
  const amount = due.reduce((sum, row) => sum + row.amountKobo, 0);
  if (!due.length || amount <= 0) {
    throw Object.assign(new Error("No Shop settlements are ready to pay out."), { status: 409 });
  }
  if (amount < min) {
    throw Object.assign(new Error("Below the minimum Shop payout."), { status: 400 });
  }

  const destination = [vendor.payoutAccountName, vendor.payoutBankName, maskAccountNumber(vendor.payoutAccountNumber)]
    .filter(Boolean)
    .join(" · ");
  const recipient = await ensureVendorRecipient(vendor);
  const reference = `ns-shop-${crypto.randomBytes(8).toString("hex")}`;

  if (!recipient || !vendor.payoutAccountNumber) {
    await prisma.shopPayout.create({
      data: {
        vendorId,
        amountKobo: amount,
        status: "needs_account",
        reference,
        note: "Add a verified Nigerian bank account under Shop earnings. Payouts go to that NUBAN after the hold period."
      }
    });
    throw Object.assign(new Error("Add a verified Nigerian bank account under Earnings & payouts first."), { status: 409 });
  }

  if (!paystackConfigured()) {
    await attachSettlements(vendorId, due.map((row) => row.id), {
      amountKobo: amount,
      status: "pending",
      reference,
      note: `Queued for ${destination || "the saved payout account"}. Paystack transfers are not configured on this host.`
    });
    return { amountKobo: amount, status: "pending", reference };
  }

  const created = await attachSettlements(vendorId, due.map((row) => row.id), {
    amountKobo: amount,
    status: "submitting",
    reference,
    note: `Transfer started to ${destination || "the vendor payout account"}.`
  });

  const transfer = await paystackJson("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount,
      currency: "NGN",
      recipient,
      reason: `NaijaSpa Shop payout ${created.id.slice(0, 8)}`,
      reference
    })
  });
  const data = transfer.data as { id?: number; status?: string; transfer_code?: string } | undefined;
  if (!transfer.status) {
    await prisma.$transaction([
      prisma.shopPayout.update({
        where: { id: created.id },
        data: { status: "failed", note: transfer.message || "Paystack transfer failed" }
      }),
      prisma.shopSettlement.updateMany({
        where: { payoutId: created.id },
        data: { payoutId: null }
      })
    ]);
    throw Object.assign(new Error(transfer.message || "Paystack transfer failed."), { status: 502 });
  }

  const outcome = transferOutcome(data?.status);
  const note = outcome.earningPaid
    ? `Sent to ${destination || "the vendor payout account"} via Paystack Transfer.`
    : data?.status === "otp"
      ? `Paystack needs OTP/approval, then ${destination || "the vendor account"} will be credited.`
      : `Transfer started to ${destination || "the vendor payout account"}. Waiting for Paystack to confirm.`;

  await prisma.$transaction([
    prisma.shopPayout.update({
      where: { id: created.id },
      data: {
        status: outcome.payoutStatus,
        note,
        providerRef: String(data?.transfer_code || data?.id || "")
      }
    }),
    ...(outcome.earningPaid
      ? [
          prisma.shopSettlement.updateMany({
            where: { payoutId: created.id },
            data: { status: "paid", paidAt: new Date() }
          }),
          prisma.shopLedgerEntry.create({
            data: { vendorId, kind: "payout", amountKobo: -amount, note: reference }
          })
        ]
      : [])
  ]);

  return { amountKobo: amount, status: outcome.payoutStatus, reference };
}

async function attachSettlements(
  vendorId: string,
  settlementIds: string[],
  payout: { amountKobo: number; status: string; reference: string; note: string }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.shopPayout.create({
      data: {
        vendorId,
        amountKobo: payout.amountKobo,
        status: payout.status,
        reference: payout.reference,
        note: payout.note
      }
    });
    await tx.shopSettlement.updateMany({
      where: { id: { in: settlementIds } },
      data: { payoutId: created.id }
    });
    return created;
  });
}

export async function applyShopPayoutTransferEvent(reference: string, status: string, providerRef?: string) {
  const payout = await prisma.shopPayout.findFirst({ where: { reference } });
  if (!payout) return null;
  const outcome = transferOutcome(status);
  await prisma.$transaction(async (tx) => {
    await tx.shopPayout.update({
      where: { id: payout.id },
      data: {
        status: outcome.payoutStatus,
        providerRef: providerRef || payout.providerRef,
        note: outcome.earningPaid
          ? "Paystack confirmed the transfer to the vendor bank account."
          : outcome.payoutStatus === "failed"
            ? "Paystack reported this transfer failed. Finance can retry."
            : payout.note
      }
    });
    if (outcome.earningPaid) {
      await tx.shopSettlement.updateMany({
        where: { payoutId: payout.id },
        data: { status: "paid", paidAt: new Date() }
      });
      const already = await tx.shopLedgerEntry.findFirst({
        where: { vendorId: payout.vendorId, kind: "payout", note: payout.reference }
      });
      if (!already) {
        await tx.shopLedgerEntry.create({
          data: {
            vendorId: payout.vendorId,
            kind: "payout",
            amountKobo: -payout.amountKobo,
            note: payout.reference
          }
        });
      }
    }
    if (outcome.payoutStatus === "failed") {
      await tx.shopSettlement.updateMany({
        where: { payoutId: payout.id, status: { not: "paid" } },
        data: { payoutId: null }
      });
    }
  });
  return prisma.shopPayout.findUnique({ where: { id: payout.id } });
}
