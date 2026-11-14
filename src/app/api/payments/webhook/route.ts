import { NextResponse } from "next/server";
import { applyChargeSuccess, verifyWebhookSignature } from "@/lib/payments";
import { applyPayoutTransferEvent } from "@/lib/payouts";
import { applyPaystackRefundEvent } from "@/lib/refunds";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as {
    event?: string;
    data?: Record<string, unknown> & {
      reference?: string;
      id?: string | number;
      status?: string;
      transfer_code?: string;
      amount?: number;
      currency?: string;
      transaction?: { reference?: string };
    };
  };
  const reference = event.data?.reference || event.data?.transaction?.reference;
  if (event.event && (event.event.startsWith("refund.") || event.event === "charge.refunded") && event.data) {
    await applyPaystackRefundEvent(event.event, event.data);
  }
  if (!reference) return NextResponse.json({ ok: true });
  if (event.event === "charge.success") {
    await applyChargeSuccess(reference, event.data?.id != null ? String(event.data.id) : reference, event.data?.amount, event.data?.currency);
  }
  if (event.event?.startsWith("transfer.")) {
    await applyPayoutTransferEvent(
      reference,
      event.data?.status || event.event.replace("transfer.", ""),
      event.data?.transfer_code ? String(event.data.transfer_code) : event.data?.id != null ? String(event.data.id) : undefined
    );
  }
  return NextResponse.json({ ok: true });
}
