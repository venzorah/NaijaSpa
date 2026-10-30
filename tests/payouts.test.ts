import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNuban, filterBanks, listPayoutBanks, maskAccountNumber, normalizeAccountNumber, resolvePayoutAccount, transferOutcome } from "../src/lib/payouts";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("vendor payout account", () => {
  it("maps the explicit sandbox resolver fixture to a valid transfer bank", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_fixture");
    const fetcher = vi.fn().mockResolvedValueOnce({ json: async () => ({ status: true, data: [{ code: "057", name: "Zenith Bank" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ status: true, data: { account_name: "Sandbox user" } }) })
      .mockResolvedValueOnce({ json: async () => ({ status: true, data: { recipient_code: "RCP_fixture" } }) });
    vi.stubGlobal("fetch", fetcher);
    expect((await resolvePayoutAccount("001", "0000000000")).recipientCode).toBe("RCP_fixture");
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({ bank_code: "057", currency: "NGN" });
  });
  it("preserves the selected transfer bank for live accounts", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_fixture");
    const fetcher = vi.fn().mockResolvedValueOnce({ json: async () => ({ status: true, data: [{ code: "058", name: "GTBank" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ status: true, data: { account_name: "Live user" } }) })
      .mockResolvedValueOnce({ json: async () => ({ status: true, data: { recipient_code: "RCP_fixture" } }) });
    vi.stubGlobal("fetch", fetcher);
    await resolvePayoutAccount("058", "0123456789");
    expect(JSON.parse(fetcher.mock.calls[2][1].body).bank_code).toBe("058");
  });
  it("allows Paystack's dedicated resolver bank only in test mode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ status: true, data: [{ code: "057", name: "Zenith Bank" }] }) })));
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_fixture");
    expect(await listPayoutBanks()).toContainEqual({ code: "001", name: "Paystack Test Bank" });
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_fixture");
    expect((await listPayoutBanks()).some((b) => b.code === "001")).toBe(false);
  });
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
