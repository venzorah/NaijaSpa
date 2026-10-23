import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "../src/lib/payments";

const originalSecret = process.env.PAYSTACK_SECRET_KEY;
const originalWebhook = process.env.PAYSTACK_WEBHOOK_SECRET;

afterEach(() => {
  process.env.PAYSTACK_SECRET_KEY = originalSecret;
  process.env.PAYSTACK_WEBHOOK_SECRET = originalWebhook;
});

describe("Paystack webhook HMAC", () => {
  it("accepts a signature hashed with the secret key", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_naijaspa";
    delete process.env.PAYSTACK_WEBHOOK_SECRET;
    const raw = JSON.stringify({ event: "charge.success", data: { reference: "NS-booking-abc" } });
    const signature = crypto.createHmac("sha512", "sk_test_naijaspa").update(raw).digest("hex");
    expect(verifyWebhookSignature(raw, signature)).toBe(true);
  });

  it("rejects a truncated or mismatched signature", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_naijaspa";
    delete process.env.PAYSTACK_WEBHOOK_SECRET;
    expect(verifyWebhookSignature("{}", "abc")).toBe(false);
    expect(verifyWebhookSignature("{}", crypto.createHmac("sha512", "other").update("{}").digest("hex"))).toBe(false);
  });
});
