import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFUND_POLICY,
  parseRefundPolicy,
  quoteCancellationRefund,
  refundStatusLabel,
  toStoredRefundStatus
} from "../src/lib/refund-policy";

describe("refund policy", () => {
  const start = new Date("2026-11-14T12:00:00+01:00");

  it("defaults auto-send off and a 12 hour free window", () => {
    const policy = parseRefundPolicy(null);
    expect(policy.autoRefundOnCancel).toBe(false);
    expect(policy.freeCancelHours).toBe(12);
    expect(policy.latePenaltyBps).toBe(5000);
    expect(policy.adminRefundsEnabled).toBe(true);
  });

  it("gives a full refund inside the free window", () => {
    const quote = quoteCancellationRefund(
      DEFAULT_REFUND_POLICY,
      20_000,
      start,
      new Date("2026-11-13T12:00:00+01:00"),
      "cancel"
    );
    expect(quote.band).toBe("free");
    expect(quote.refundKobo).toBe(20_000);
    expect(quote.penaltyKobo).toBe(0);
  });

  it("keeps a late-cancel penalty", () => {
    const quote = quoteCancellationRefund(
      DEFAULT_REFUND_POLICY,
      20_000,
      start,
      new Date("2026-11-14T06:00:00+01:00"),
      "cancel"
    );
    expect(quote.band).toBe("late");
    expect(quote.refundKobo).toBe(10_000);
    expect(quote.penaltyKobo).toBe(10_000);
  });

  it("keeps a no-show as non-refundable by default", () => {
    const quote = quoteCancellationRefund(DEFAULT_REFUND_POLICY, 20_000, start, start, "no_show");
    expect(quote.band).toBe("no_show");
    expect(quote.refundKobo).toBe(0);
    expect(quote.penaltyKobo).toBe(20_000);
  });

  it("maps admin refund labels to stored statuses", () => {
    expect(toStoredRefundStatus("completed")).toBe("processed");
    expect(toStoredRefundStatus("processing")).toBe("submitting");
    expect(toStoredRefundStatus("pending")).toBe("pending");
    expect(refundStatusLabel("processed")).toBe("completed");
    expect(refundStatusLabel("submitting")).toBe("processing");
  });

  it("refunds a late Paystack charge in full", () => {
    const quote = quoteCancellationRefund(DEFAULT_REFUND_POLICY, 20_000, start, start, "late_charge");
    expect(quote.band).toBe("full");
    expect(quote.refundKobo).toBe(20_000);
  });
});
