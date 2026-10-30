import { NextResponse } from "next/server";
import { applyChargeSuccess, verifyWebhookSignature } from "@/lib/payments";
import { applyPayoutTransferEvent } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as {
    event?: string;
    data?: { reference?: string; id?: string | number; status?: string; transfer_code?: string; amount?: number; currency?: string };
  };
  const reference = event.data?.reference;
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
