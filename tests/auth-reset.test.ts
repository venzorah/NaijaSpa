import { describe, expect, it } from "vitest";
import { generateResetOtp, hashResetOtp, normalizeResetOtp, RESET_OTP_LENGTH } from "../src/lib/auth-reset";

describe("password reset OTP", () => {
  it("normalizes and hashes a 6-digit code per user", () => {
    expect(normalizeResetOtp("48 29 13")).toBe("482913");
    expect(generateResetOtp()).toMatch(new RegExp(`^\\d{${RESET_OTP_LENGTH}}$`));
    const a = hashResetOtp("user-a", "482913");
    const b = hashResetOtp("user-b", "482913");
    expect(a).not.toBe(b);
    expect(hashResetOtp("user-a", "482913")).toBe(a);
    expect(a).toHaveLength(64);
  });
});
