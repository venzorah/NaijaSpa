import crypto from "crypto";

export const RESET_OTP_MINUTES = 15;
export const RESET_OTP_LENGTH = 6;
export const RESET_MAX_ATTEMPTS = 5;
export const RESET_RESEND_SECONDS = 60;

export function generateResetOtp() {
  return String(crypto.randomInt(0, 10 ** RESET_OTP_LENGTH)).padStart(RESET_OTP_LENGTH, "0");
}

export function normalizeResetOtp(value: string) {
  return value.replace(/\D/g, "");
}

function otpSecret() {
  const secret = process.env.OTP_HASH_SECRET?.trim();
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) throw Object.assign(new Error("OTP security is not configured"), { status: 503 });
  return Buffer.from(secret, "base64url");
}

export function assertOtpSecurityConfigured() { otpSecret(); }

export type OtpPurpose = "password-reset" | "email-verify";

export function hashOtp(purpose: OtpPurpose, userId: string, challengeId: string, otp: string) {
  return crypto.createHmac("sha256", otpSecret()).update(JSON.stringify([purpose, userId, challengeId, normalizeResetOtp(otp)])).digest("hex");
}

export function hashResetOtp(userId: string, challengeId: string, otp: string) {
  return hashOtp("password-reset", userId, challengeId, otp);
}

export function otpMatches(purpose: OtpPurpose, digest: string, userId: string, challengeId: string, otp: string) {
  const expected = hashOtp(purpose, userId, challengeId, otp);
  return /^[a-f0-9]{64}$/.test(digest) && crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
}

export function resetOtpMatches(digest: string, userId: string, challengeId: string, otp: string) {
  return otpMatches("password-reset", digest, userId, challengeId, otp);
}
