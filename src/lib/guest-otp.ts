import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import { prisma } from "./db";
import {
  assertOtpSecurityConfigured,
  generateResetOtp,
  normalizeResetOtp,
  RESET_MAX_ATTEMPTS,
  RESET_OTP_LENGTH,
  RESET_OTP_MINUTES,
  RESET_RESEND_SECONDS
} from "./auth-reset";

function otpSecret() {
  const secret = process.env.OTP_HASH_SECRET?.trim();
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
    throw Object.assign(new Error("OTP security is not configured"), { status: 503 });
  }
  return Buffer.from(secret, "base64url");
}

export function hashPhoneOtp(phoneNormalized: string, challengeId: string, purpose: string, otp: string) {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(JSON.stringify(["phone-otp", purpose, phoneNormalized, challengeId, normalizeResetOtp(otp)]))
    .digest("hex");
}

export function phoneOtpMatches(digest: string, phoneNormalized: string, challengeId: string, purpose: string, otp: string) {
  const expected = hashPhoneOtp(phoneNormalized, challengeId, purpose, otp);
  return (
    /^[a-f0-9]{64}$/.test(digest) && crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"))
  );
}

export async function issuePhoneOtp(phoneNormalized: string, purpose: string) {
  assertOtpSecurityConfigured();
  const id = randomUUID();
  const code = generateResetOtp();
  const token = hashPhoneOtp(phoneNormalized, id, purpose, code);
  const now = new Date();
  const previous = await prisma.phoneOtpChallenge.findFirst({
    where: { phoneNormalized, purpose },
    orderBy: { createdAt: "desc" }
  });
  if (previous && now.getTime() - previous.createdAt.getTime() < RESET_RESEND_SECONDS * 1000) {
    throw Object.assign(new Error("Wait a minute before requesting another code."), { status: 429, retryAfterMs: RESET_RESEND_SECONDS * 1000 });
  }
  await prisma.phoneOtpChallenge.updateMany({
    where: { phoneNormalized, purpose, expiresAt: { gt: now } },
    data: { expiresAt: now }
  });
  await prisma.phoneOtpChallenge.create({
    data: {
      id,
      phoneNormalized,
      purpose,
      token,
      expiresAt: new Date(now.getTime() + RESET_OTP_MINUTES * 60_000),
      createdAt: now
    }
  });
  return { id, code };
}

export async function consumePhoneOtp(phoneNormalized: string, purpose: string, otp: string) {
  assertOtpSecurityConfigured();
  const now = new Date();
  const row = await prisma.phoneOtpChallenge.findFirst({
    where: { phoneNormalized, purpose, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" }
  });
  if (!row || row.failedAttempts >= RESET_MAX_ATTEMPTS) {
    throw Object.assign(new Error("Invalid or expired code."), { status: 400 });
  }
  if (!phoneOtpMatches(row.token, phoneNormalized, row.id, purpose, otp)) {
    const failedAttempts = row.failedAttempts + 1;
    await prisma.phoneOtpChallenge.update({
      where: { id: row.id },
      data: { failedAttempts, ...(failedAttempts >= RESET_MAX_ATTEMPTS ? { expiresAt: now } : {}) }
    });
    throw Object.assign(new Error("Invalid or expired code."), { status: 400 });
  }
  await prisma.phoneOtpChallenge.update({ where: { id: row.id }, data: { expiresAt: now } });
  return true;
}

export { RESET_OTP_LENGTH, RESET_OTP_MINUTES };
