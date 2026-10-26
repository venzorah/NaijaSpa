import crypto from "crypto";

export const RESET_OTP_MINUTES = 15;
export const RESET_OTP_LENGTH = 6;

export function generateResetOtp() {
  return String(crypto.randomInt(0, 10 ** RESET_OTP_LENGTH)).padStart(RESET_OTP_LENGTH, "0");
}

export function normalizeResetOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, RESET_OTP_LENGTH);
}

export function hashResetOtp(userId: string, otp: string) {
  return crypto.createHash("sha256").update(`${userId}:${normalizeResetOtp(otp)}`).digest("hex");
}
