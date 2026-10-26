import { describe, expect, it } from "vitest";
import { assertNuban, maskAccountNumber, normalizeAccountNumber } from "../src/lib/payouts";

describe("vendor payout account", () => {
  it("normalizes a 10-digit NUBAN", () => {
    expect(normalizeAccountNumber("012-345-6789")).toBe("0123456789");
    expect(assertNuban("0123456789")).toBe("0123456789");
    expect(() => assertNuban("123")).toThrow(/10-digit/);
    expect(maskAccountNumber("0123456789")).toBe("••••6789");
  });
});
