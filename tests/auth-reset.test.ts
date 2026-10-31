import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateResetOtp, hashResetOtp, normalizeResetOtp, RESET_OTP_LENGTH } from "../src/lib/auth-reset";

beforeEach(() => vi.stubEnv("OTP_HASH_SECRET", Buffer.alloc(32, 7).toString("base64url")));
afterEach(() => vi.unstubAllEnvs());

describe("password reset OTP", () => {
  it("normalizes and hashes a 6-digit code per user", () => {
    expect(normalizeResetOtp("48 29 13")).toBe("482913");
    expect(generateResetOtp()).toMatch(new RegExp(`^\\d{${RESET_OTP_LENGTH}}$`));
    const a = hashResetOtp("user-a", "challenge-a", "482913");
    const b = hashResetOtp("user-b", "challenge-a", "482913");
    expect(a).not.toBe(b);
    expect(hashResetOtp("user-a", "challenge-a", "482913")).toBe(a);
    expect(hashResetOtp("user-a", "challenge-b", "482913")).not.toBe(a);
    expect(a).toHaveLength(64);
  });
  it("does not truncate extra digits or remove non-space characters", () => {
    expect(normalizeResetOtp("482913999")).toBe("482913999");
    expect(normalizeResetOtp("48x2913")).toBe("48x2913");
  });
  it("requires a persistent secret instead of an unkeyed fallback", () => {
    vi.stubEnv("OTP_HASH_SECRET", "");
    expect(() => hashResetOtp("user", "challenge", "482913")).toThrow(/not configured/);
  });
});
