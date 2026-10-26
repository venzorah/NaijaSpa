import { describe, expect, it } from "vitest";
import { assertNuban, filterBanks, maskAccountNumber, normalizeAccountNumber, transferOutcome } from "../src/lib/payouts";

describe("vendor payout account", () => {
  it("normalizes a 10-digit NUBAN", () => {
    expect(normalizeAccountNumber("012-345-6789")).toBe("0123456789");
    expect(assertNuban("0123456789")).toBe("0123456789");
    expect(() => assertNuban("123")).toThrow(/10-digit/);
    expect(maskAccountNumber("0123456789")).toBe("••••6789");
  });

  it("only marks an earning paid after Paystack confirms the transfer", () => {
    expect(transferOutcome("success")).toEqual({ payoutStatus: "paid", earningPaid: true });
    expect(transferOutcome("pending").earningPaid).toBe(false);
    expect(transferOutcome("otp").payoutStatus).toBe("otp");
    expect(transferOutcome("failed")).toEqual({ payoutStatus: "failed", earningPaid: false });
  });

  it("filters banks by name or code", () => {
    const banks = [
      { code: "057", name: "Zenith Bank" },
      { code: "100033", name: "OPay Digital Services Limited (OPay)" }
    ];
    expect(filterBanks(banks, "opay")).toEqual([banks[1]]);
    expect(filterBanks(banks, "057")).toEqual([banks[0]]);
    expect(filterBanks(banks, "")).toEqual(banks);
  });
});
