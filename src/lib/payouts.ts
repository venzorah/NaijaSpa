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

export async function saveVendorPayoutAccount(vendorId: string, bankCode: string, accountNumber: string) {
  const nuban = assertNuban(accountNumber);
  const code = bankCode.trim();
  if (!code) throw Object.assign(new Error("Choose a bank"), { status: 400 });
  const banks = await listPayoutBanks();
  const bank = banks.find((b) => b.code === code);
  if (!bank) throw Object.assign(new Error("Unknown bank"), { status: 400 });

  let accountName = "";
  let recipientCode: string | null = null;
  if (paystackConfigured()) {
    const resolved = await paystackJson(`/bank/resolve?account_number=${nuban}&bank_code=${encodeURIComponent(code)}`);
    const data = resolved.data as { account_name?: string } | undefined;
    if (!resolved.status || !data?.account_name) {
      throw Object.assign(new Error(resolved.message || "Could not verify that account"), { status: 400 });
    }
    accountName = data.account_name;
    const recipient = await paystackJson("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: accountName,
        account_number: nuban,
        bank_code: code,
        currency: "NGN"
      })
    });
    const rec = recipient.data as { recipient_code?: string } | undefined;
    if (!recipient.status || !rec?.recipient_code) {
      throw Object.assign(new Error(recipient.message || "Could not save Paystack recipient"), { status: 502 });
    }
    recipientCode = rec.recipient_code;
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      payoutBankCode: code,
      payoutBankName: bank.name,
      payoutAccountNumber: nuban,
      payoutAccountName: accountName || undefined,
      payoutRecipientCode: recipientCode
    },
    select: {
      payoutBankCode: true,
      payoutBankName: true,
      payoutAccountNumber: true,
      payoutAccountName: true,
      payoutRecipientCode: true
    }
  });
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
  const reference = `NS-PO-${crypto.randomBytes(8).toString("hex")}`;

  if (!vendor.payoutRecipientCode || !vendor.payoutAccountNumber) {
    await prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: "needs_account",
        note: "Add a payout bank account under Earnings to receive this automatically.",
        reference
      },
      update: { status: "needs_account", note: "Add a payout bank account under Earnings to receive this automatically." }
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
        note: "Paystack transfers are not configured. Finance can mark this paid after a manual transfer.",
        reference
      },
      update: { status: "pending" }
    });
    return earning;
  }

  const transfer = await paystackJson("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: earning.payableKobo,
      recipient: vendor.payoutRecipientCode,
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

  await prisma.$transaction([
    prisma.vendorEarning.update({ where: { id: earning.id }, data: { status: "paid" } }),
    prisma.payout.upsert({
      where: { earningId: earning.id },
      create: {
        vendorId: vendor.id,
        earningId: earning.id,
        amountKobo: earning.payableKobo,
        status: data?.status === "success" || data?.status === "otp" ? data.status : "paid",
        note: "Sent via Paystack Transfer after the visit was confirmed.",
        reference,
        providerRef: String(data?.transfer_code || data?.id || "")
      },
      update: {
        status: "paid",
        note: "Sent via Paystack Transfer after the visit was confirmed.",
        reference,
        providerRef: String(data?.transfer_code || data?.id || "")
      }
    })
  ]);
  return prisma.vendorEarning.findUnique({ where: { id: earning.id } });
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
