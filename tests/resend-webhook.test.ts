import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyResendWebhookSignature } from "../src/lib/resend-webhook";

const original = process.env.RESEND_WEBHOOK_SECRET;

afterEach(() => {
  if (original === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
  else process.env.RESEND_WEBHOOK_SECRET = original;
});

function sign(raw: string, secret: string, id = "msg_1", timestamp = String(Math.floor(Date.now() / 1000))) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest("base64");
  return {
    raw,
    headers: new Headers({
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`
    })
  };
}

describe("Resend webhook HMAC", () => {
  it("accepts a current Svix signature", () => {
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("naijaspa-resend-webhook").toString("base64")}`;
    const { raw, headers } = sign(JSON.stringify({ type: "email.delivered" }), process.env.RESEND_WEBHOOK_SECRET);
    expect(verifyResendWebhookSignature(raw, headers)).toBe(true);
  });

  it("rejects a mismatched or stale signature", () => {
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("naijaspa-resend-webhook").toString("base64")}`;
    const { raw, headers } = sign("{}", process.env.RESEND_WEBHOOK_SECRET);
    headers.set("svix-signature", "v1,aaaa");
    expect(verifyResendWebhookSignature(raw, headers)).toBe(false);
    const stale = sign("{}", process.env.RESEND_WEBHOOK_SECRET, "msg_2", String(Math.floor(Date.now() / 1000) - 301));
    expect(verifyResendWebhookSignature(stale.raw, stale.headers)).toBe(false);
  });
});
