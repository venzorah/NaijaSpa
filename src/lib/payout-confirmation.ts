import { prisma } from "./db";
import { applyPayoutTransferEvent } from "./payouts";

async function provider(path: string, body?: object) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw Object.assign(new Error("Paystack is not configured"), { status: 503 });
  const response = await fetch(`https://api.paystack.co${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok || !result.status) throw Object.assign(new Error(body ? "Paystack did not accept the transfer OTP. Check it and try again." : "Paystack could not verify this transfer yet. Do not retry it until its status is known."), { status: 400 });
  return result.data as { reference?: string; amount?: number; currency?: string; status?: string; transfer_code?: string };
}

export async function refreshPayout(payoutId: string) {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (!payout.reference) throw Object.assign(new Error("Transfer reference is missing"), { status: 400 });
  const data = await provider(`/transfer/verify/${encodeURIComponent(payout.reference)}`);
  if (data.reference !== payout.reference || data.amount !== payout.amountKobo || data.currency !== "NGN" || !data.status) throw Object.assign(new Error("Paystack returned transfer details that do not match this payout"), { status: 502 });
  await applyPayoutTransferEvent(payout.reference, data.status, data.transfer_code);
  return prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
}

export async function finalizePayoutOtp(payoutId: string, otp: string) {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "otp" || !payout.providerRef?.startsWith("TRF_")) throw Object.assign(new Error("This payout is not awaiting an OTP"), { status: 409 });
  await provider("/transfer/finalize_transfer", { transfer_code: payout.providerRef, otp });
  return refreshPayout(payoutId);
}
