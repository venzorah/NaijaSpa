import crypto from "crypto";

const MAX_AGE_SECONDS = 300;

export function resendWebhookSecret() {
  return process.env.RESEND_WEBHOOK_SECRET?.trim() || "";
}

export function verifyResendWebhookSignature(raw: string, headers: { get(name: string): string | null }) {
  const secret = resendWebhookSecret();
  const id = headers.get("svix-id")?.trim();
  const timestamp = headers.get("svix-timestamp")?.trim();
  const signature = headers.get("svix-signature")?.trim();
  if (!secret || !id || !timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest("base64");
  return signature.split(" ").some((part) => {
    const value = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
    const got = Buffer.from(value);
    const want = Buffer.from(expected);
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  });
}
