import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  db: {
    $transaction: vi.fn(), $queryRaw: vi.fn(),
    payment: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    vendorSubscription: { updateMany: vi.fn(), create: vi.fn() }
  }
}));
vi.mock("../src/lib/db", () => ({ prisma: mocks.db }));
vi.mock("../src/lib/booking", () => ({ confirmBookingFromPayment: mocks.confirm }));
import { applyChargeSuccess, verifyPaystack } from "../src/lib/payments";

let payment: {
  id: string; reference: string; bookingId: string | null; amountKobo: number; currency: string;
  status: string; purpose: string; rawPayload: string | null; providerRef: string | null; subscriptionId: string | null;
};
beforeEach(() => {
  vi.resetAllMocks();
  payment = {
    id: "payment", reference: "reference", bookingId: "booking", amountKobo: 10000, currency: "NGN",
    status: "pending", purpose: "booking", rawPayload: null, providerRef: null, subscriptionId: null
  };
  mocks.db.payment.findUnique.mockImplementation(async () => ({ ...payment }));
  mocks.db.payment.findUniqueOrThrow.mockImplementation(async () => ({ ...payment }));
  mocks.db.payment.update.mockImplementation(async ({ data }) => { Object.assign(payment, data); return { ...payment }; });
  // Model rollback so a failed fulfillment cannot leave the payment successful.
  mocks.db.$transaction.mockImplementation(async (fn) => {
    const snapshot = { ...payment };
    try { return await fn(mocks.db); } catch (error) { payment = snapshot; throw error; }
  });
  mocks.db.subscriptionPlan.findUnique.mockResolvedValue({ id: "plan", code: "GOLD", durationDays: 30 });
  mocks.db.vendorSubscription.create.mockResolvedValue({ id: "subscription" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("payment fulfillment", () => {
  it("rolls back payment success when confirmation fails, then fulfills a retry", async () => {
    mocks.confirm.mockRejectedValueOnce(new Error("database interrupted")).mockResolvedValueOnce({ status: "confirmed" });
    await expect(applyChargeSuccess("reference", "provider", 10000, "NGN")).rejects.toThrow("database interrupted");
    expect(payment.status).toBe("pending");
    await applyChargeSuccess("reference", "provider", 10000, "NGN");
    expect(payment.status).toBe("success");
    expect(mocks.confirm).toHaveBeenLastCalledWith("booking", undefined, mocks.db);
  });
  it("repairs an older successful payment whose booking was never fulfilled", async () => {
    payment.status = "success";
    await verifyPaystack("reference");
    expect(mocks.confirm).toHaveBeenCalledWith("booking", undefined, mocks.db);
  });
  it.each([[9999, "NGN"], [10000, "USD"], [undefined, undefined]])("rejects mismatched webhook amounts or currencies", async (amount, currency) => {
    await expect(applyChargeSuccess("reference", "provider", amount as number | undefined, currency as string | undefined)).rejects.toMatchObject({ status: 400 });
    expect(mocks.db.payment.update).not.toHaveBeenCalled();
  });
  it("grants a subscription and links its payment in the same transaction only once", async () => {
    Object.assign(payment, { purpose: "subscription", bookingId: null, rawPayload: JSON.stringify({ metadata: { vendorId: "vendor", planCode: "GOLD" } }) });
    await applyChargeSuccess("reference", "provider", 10000, "NGN");
    expect(payment.subscriptionId).toBe("subscription");
    await applyChargeSuccess("reference", "provider", 10000, "NGN");
    expect(mocks.db.vendorSubscription.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.db.payment.update.mock.invocationCallOrder[0]);
  });
  it("retries a failed subscription grant without losing purchase metadata", async () => {
    Object.assign(payment, { purpose: "subscription", bookingId: null, rawPayload: JSON.stringify({ metadata: { vendorId: "vendor", planCode: "GOLD" } }) });
    mocks.db.vendorSubscription.create.mockRejectedValueOnce(new Error("database interrupted")).mockResolvedValueOnce({ id: "subscription" });
    await expect(applyChargeSuccess("reference", "provider", 10000, "NGN")).rejects.toThrow();
    expect(payment.status).toBe("pending");
    await applyChargeSuccess("reference", "provider", 10000, "NGN");
    expect(payment.subscriptionId).toBe("subscription");
  });
  it("requires verification to match the expected reference, amount and currency", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ status: true, data: {
      status: "success", amount: 10000, currency: "NGN", reference: "wrong-reference"
    } }) })));
    await verifyPaystack("reference");
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.db.payment.updateMany).toHaveBeenCalledWith({ where: { id: "payment", status: { not: "success" } }, data: { status: "failed" } });
  });
});
