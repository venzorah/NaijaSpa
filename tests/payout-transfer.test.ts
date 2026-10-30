import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  booking: { findUnique: vi.fn() }, payment: { findFirst: vi.fn() },
  vendorEarning: { update: vi.fn(), findUnique: vi.fn() },
  payout: { findUnique: vi.fn(), upsert: vi.fn() }
}));
vi.mock("../src/lib/db", () => ({ prisma: db }));
import { releaseVendorPayout } from "../src/lib/payouts";
let payout: { status: string; reference: string; providerRef: string | null } | null;
const earning = { id: "earning", status: "pending", payableKobo: 9000 };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_fixture");
  payout = null;
  db.booking.findUnique.mockResolvedValue({ id: "booking", status: "completed", customerTotalKobo: 10000, currency: "NGN", earning,
    vendor: { id: "vendor", payoutRecipientCode: "RCP_fixture", payoutAccountNumber: "0000000000" } });
  db.payment.findFirst.mockResolvedValue({ id: "paid" });
  db.payout.findUnique.mockImplementation(async () => payout && { ...payout });
  db.payout.upsert.mockImplementation(async ({ create, update }) => {
    payout = payout ? { ...payout, ...update } : { ...create }; return payout;
  });
  db.$transaction.mockImplementation(async (arg) => typeof arg === "function" ? arg(db) : Promise.all(arg));
  db.vendorEarning.findUnique.mockResolvedValue(earning);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("payout transfer safety", () => {
  it("sends NGN and a valid reference, then suppresses repeat submission awaiting OTP", async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => ({ status: 200, json: async () => ({ status: true, data: { status: "otp", transfer_code: "TRF_fixture" } }) }));
    vi.stubGlobal("fetch", fetcher);
    await releaseVendorPayout("booking");
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(request).toMatchObject({ currency: "NGN", amount: 9000, recipient: "RCP_fixture" });
    expect(request.reference).toMatch(/^[a-z0-9_-]{16,50}$/);
    expect(payout?.status).toBe("otp");
    await releaseVendorPayout("booking");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reserves before contacting the provider and keeps uncertainty for verification", async () => {
    const fetcher = vi.fn(async () => { expect(payout?.status).toBe("submitting"); throw new Error("timeout"); });
    vi.stubGlobal("fetch", fetcher);
    await expect(releaseVendorPayout("booking")).rejects.toThrow("timeout");
    await releaseVendorPayout("booking");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(payout?.status).toBe("submitting");
  });
  it("does not make a server error retryable without verifying the reserved reference", async () => {
    const fetcher = vi.fn(async () => ({ status: 503, json: async () => ({ status: false }) }));
    vi.stubGlobal("fetch", fetcher);
    await expect(releaseVendorPayout("booking")).rejects.toMatchObject({ status: 503 });
    expect(payout?.status).toBe("submitting");
  });
  it("does not submit when another request reserves the earning during recipient lookup", async () => {
    db.payout.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "submitting", reference: "ns-po-existing12345", providerRef: null });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await releaseVendorPayout("booking");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
