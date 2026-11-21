import { NextResponse } from "next/server";
import { resendWebhookSecret, verifyResendWebhookSignature } from "@/lib/resend-webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!resendWebhookSecret()) {
    return NextResponse.json({ error: "Resend webhook is not configured" }, { status: 503 });
  }
  const raw = await req.text();
  if (!verifyResendWebhookSignature(raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { type?: string; data?: { to?: string | string[]; email_id?: string } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const type = event.type || "";
  if (type === "email.bounced" || type === "email.complained" || type === "email.delivery_delayed") {
    console.warn("[resend]", type, event.data?.email_id || "", event.data?.to || "");
  }
  return NextResponse.json({ ok: true });
}
