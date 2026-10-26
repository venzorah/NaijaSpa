import crypto from "crypto";
import { prisma } from "./db";
import { paystackConfigured } from "./payments";

export const FALLBACK_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" }
];

export function normalizeAccountNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function assertNuban(raw: string) {
  const n = normalizeAccountNumber(raw);
  if (n.length !== 10) {
    throw Object.assign(new Error("Enter a 10-digit Nigerian account number"), { status: 400 });
  }
  return n;
}

function paystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw Object.assign(new Error("Paystack is not configured"), { status: 503 });
  return key;
}

async function paystackJson(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  return (await res.json()) as { status?: boolean; message?: string; data?: unknown };
}

export async function listPayoutBanks() {
  if (!paystackConfigured()) return FALLBACK_BANKS;
  try {
    const json = await paystackJson("/bank?currency=NGN&country=nigeria");
    const rows = Array.isArray(json.data) ? json.data : [];
    const banks = rows
      .map((row) => {
        const r = row as { code?: string; name?: string; active?: boolean };
        return { code: String(r.code || ""), name: String(r.name || "") };
      })
      .filter((b) => b.code && b.name);
    return banks.length ? banks : FALLBACK_BANKS;
  } catch {
    return FALLBACK_BANKS;
  }
}

export function transferOutcome(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();
  if (value === "success" || value === "received") return { payoutStatus: "paid", earningPaid: true as const };
  if (value === "failed" || value === "reversed" || value === "abandoned") {
    return { payoutStatus: "failed", earningPaid: false as const };
  }
  return { payoutStatus: value === "otp" ? "otp" : "pending", earningPaid: false as const };
}

export function filterBanks(banks: Array<{ code: string; name: string }>, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return banks;
  return banks.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q));
}

export async function lookupPayoutAccount(bankCode: string, accountNumber: string) {
  const nuban = assertNuban(accountNumber);
  const code = bankCode.trim();
  if (!code) throw Object.assign(new Error("Choose a bank"), { status: 400 });
  const banks = await listPayoutBanks();
  const bank = banks.find((b) => b.code === code);
  if (!bank) throw Object.assign(new Error("Unknown bank"), { status: 400 });
  if (!paystackConfigured()) {
    return { nuban, bank, accountName: "" };
  }
  const resolved = await paystackJson(`/bank/resolve?account_number=${nuban}&bank_code=${encodeURIComponent(code)}`);
  const data = resolved.data as { account_name?: string } | undefined;
  if (!resolved.status || !data?.account_name) {
    throw Object.assign(new Error(resolved.message || "Could not verify that account"), { status: 400 });
  }
  return { nuban, bank, accountName: data.account_name };
}

export async function resolvePayoutAccount(bankCode: string, accountNumber: string) {
  const looked = await lookupPayoutAccount(bankCode, accountNumber);
  if (!paystackConfigured()) {
    return { ...looked, recipientCode: null as string | null };
  }
  const recipient = await paystackJson("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: looked.accountName,
      account_number: looked.nuban,
      bank_code: looked.bank.code,
      currency: "NGN"
    })
  });
  const rec = recipient.data as { recipient_code?: string } | undefined;
  if (!recipient.status || !rec?.recipient_code) {
    throw Object.assign(new Error(recipient.message || "Could not save Paystack recipient"), { status: 502 });
  }
  return { ...looked, recipientCode: rec.recipient_code };
}

const payoutAccountSelect = {
  payoutBankCode: true,
  payoutBankName: true,
  payoutAccountNumber: true,
  payoutAccountName: true,
  payoutRecipientCode: true
} as const;

export async function saveVendorPayoutAccount(vendorId: string, bankCode: string, accountNumber: string) {
  const resolved = await resolvePayoutAccount(bankCode, accountNumber);
  const saved = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      payoutBankCode: resolved.bank.code,
      payoutBankName: resolved.bank.name,
      payoutAccountNumber: resolved.nuban,
      payoutAccountName: resolved.accountName || undefined,
      payoutRecipientCode: resolved.recipientCode
    },
    select: payoutAccountSelect
  });
  await flushVendorPayouts(vendorId);
  return saved;
}

async function ensureVendorRecipient(vendor: {
  id: string;
  payoutRecipientCode: string | null;
  payoutAccountNumber: string | null;
  payoutBankCode: string | null;
}) {
  if (vendor.payoutRecipientCode) return vendor.payoutRecipientCode;
  if (!vendor.payoutAccountNumber || !vendor.payoutBankCode) return null;
  if (!paystackConfigured()) return null;
  const resolved = await resolvePayoutAccount(vendor.payoutBankCode, vendor.payoutAccountNumber);
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      payoutBankName: resolved.bank.name,
      payoutAccountName: resolved.accountName || undefined,
      payoutRecipientCode: resolved.recipientCode
    }
  });
  return resolved.recipientCode;
}

export function maskAccountNumber(nuban: string | null | undefined) {
  if (!nuban) return "";
  if (nuban.length < 4) return nuban;
  return `••••${nuban.slice(-4)}`;
}

export async function releaseVendorPayout(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { earning: true, vendor: true }
  });
  if (!booking) return null;
  let earning = booking.earning;
  if (!earning) {
    earning = await prisma.vendorEarning.create({
      data: {
        vendorId: booking.vendorId,
        bookingId: booking.id,
        payableKobo: booking.vendorPayableKobo,
        commissionKobo: booking.commissionKobo,
        surchargeKobo: booking.surchargeKobo,
        status: "pending"
      }
    });
  }
  if (earning.status === "paid") return earning;
  if (earning.payableKobo < 100) {
    await prisma.vendorEarning.update({ where: { id: earning.id }, data: { status: "paid" } });
    return earning;
  }

  const vendor = booking.vendor;
  const existingPayout = await prisma.payout.findUnique({ where: { earningId: earning.id } });
  if (existingPayout && ["paid", "pending", "otp"].includes(existingPayout.status) && existingPayout.providerRef) {
    return earning;
  }

  const recipient = await ensureVendorRecipient(vendor);
  const destination = [vendor.payoutAccountName, vendor.payoutBankName, maskAccountNumber(vendor.payoutAccountNumber)]
    .filter(Boolean)
    .join(" · ");

  if (!recipient || !vendor.payoutAccountNumber) {
    await prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: "needs_account",
        note: "Add a verified Nigerian bank account under Earnings. Payouts go to that NUBAN after the visit is confirmed.",
        reference: `NS-PO-${crypto.randomBytes(8).toString("hex")}`
      },
      update: {
        status: "needs_account",
        note: "Add a verified Nigerian bank account under Earnings. Payouts go to that NUBAN after the visit is confirmed."
      }
    });
    return earning;
  }

  if (!paystackConfigured()) {
    await prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: "pending",
        note: `Queued for ${destination || "the saved payout account"}. Paystack transfers are not configured on this host.`,
        reference: `NS-PO-${crypto.randomBytes(8).toString("hex")}`
      },
      update: {
        status: "pending",
        note: `Queued for ${destination || "the saved payout account"}. Paystack transfers are not configured on this host.`
      }
    });
    return earning;
  }

  const reference = existingPayout?.status === "failed" || !existingPayout?.reference
    ? `NS-PO-${crypto.randomBytes(8).toString("hex")}`
    : existingPayout.reference;

  const transfer = await paystackJson("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: earning.payableKobo,
      recipient,
      reason: `NaijaSpa booking ${booking.id.slice(0, 8)}`,
      reference
    })
  });
  const data = transfer.data as { id?: number; status?: string; transfer_code?: string } | undefined;
  if (!transfer.status) {
    await prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: "failed",
        note: transfer.message || "Paystack transfer failed",
        reference
      },
      update: { status: "failed", note: transfer.message || "Paystack transfer failed", reference }
    });
    return earning;
  }

  const outcome = transferOutcome(data?.status);
  const note = outcome.earningPaid
    ? `Sent to ${destination || "the vendor payout account"} via Paystack Transfer.`
    : data?.status === "otp"
      ? `Paystack needs OTP/approval, then ${destination || "the vendor account"} will be credited.`
      : `Transfer started to ${destination || "the vendor payout account"}. Waiting for Paystack to confirm.`;

  await prisma.$transaction([
    prisma.vendorEarning.update({
      where: { id: earning.id },
      data: { status: outcome.earningPaid ? "paid" : "pending" }
    }),
    prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: outcome.payoutStatus,
        note,
        reference,
        providerRef: String(data?.transfer_code || data?.id || "")
      },
      update: {
        status: outcome.payoutStatus,
        note,
        reference,
        providerRef: String(data?.transfer_code || data?.id || "")
      }
    })
  ]);
  return prisma.vendorEarning.findUnique({ where: { id: earning.id } });
}

export async function applyPayoutTransferEvent(reference: string, status: string, providerRef?: string) {
  const payout = await prisma.payout.findFirst({ where: { reference } });
  if (!payout) return null;
  const outcome = transferOutcome(status);
  await prisma.$transaction([
    prisma.payout.update({
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
    }),
    ...(payout.earningId
      ? [
          prisma.vendorEarning.update({
            where: { id: payout.earningId },
            data: { status: outcome.earningPaid ? "paid" : "pending" }
          })
        ]
      : [])
  ]);
  return prisma.payout.findUnique({ where: { id: payout.id } });
}

export async function flushVendorPayouts(vendorId: string) {
  const due = await prisma.vendorEarning.findMany({
    where: { vendorId, status: "pending", booking: { status: "completed" } },
    select: { bookingId: true }
  });
  for (const row of due) {
    await releaseVendorPayout(row.bookingId);
  }
  return due.length;
}

export async function markBookingCompleted(bookingId: string, actorId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status === "completed") {
    await releaseVendorPayout(bookingId);
    return booking;
  }
  if (!["confirmed", "in_progress"].includes(booking.status)) {
    throw Object.assign(new Error("This booking is not ready to confirm yet"), { status: 400 });
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "completed",
      statusHistory: { create: { fromStatus: booking.status, toStatus: "completed", actorId } }
    }
  });
  await releaseVendorPayout(bookingId);
  return updated;
}
