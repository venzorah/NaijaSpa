export const REFUND_CONFIG_KEY = "finance.refundPolicy";

export type RefundPolicy = {
  paystackRefundsEnabled: boolean;
  adminRefundsEnabled: boolean;
  customerCancelEnabled: boolean;
  autoRefundOnCancel: boolean;
  vendorCancelQueuesRefund: boolean;
  freeCancelHours: number;
  latePenaltyBps: number;
  noShowPenaltyBps: number;
  minRefundKobo: number;
};

export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  paystackRefundsEnabled: true,
  adminRefundsEnabled: true,
  customerCancelEnabled: true,
  autoRefundOnCancel: false,
  vendorCancelQueuesRefund: true,
  freeCancelHours: 12,
  latePenaltyBps: 5000,
  noShowPenaltyBps: 10_000,
  minRefundKobo: 100
};

export type RefundQuoteKind = "cancel" | "no_show" | "late_charge";

export const REFUND_STATUS_OPTIONS = [
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "processing", label: "Processing" },
  { id: "failed", label: "Failed" },
  { id: "rejected", label: "Kept / rejected" }
] as const;

export function toStoredRefundStatus(status: string) {
  const value = status.trim().toLowerCase();
  if (value === "completed" || value === "processed" || value === "paid") return "processed";
  if (value === "pending" || value === "open") return "pending";
  if (value === "failed") return "failed";
  if (value === "rejected" || value === "declined" || value === "kept") return "rejected";
  if (value === "submitting" || value === "processing") return "submitting";
  throw Object.assign(new Error("Refund status must be pending, completed, processing, failed or rejected."), { status: 400 });
}

export function refundStatusLabel(status: string) {
  if (status === "processed") return "completed";
  if (status === "submitting") return "processing";
  return status;
}

export type RefundQuote = {
  refundKobo: number;
  penaltyKobo: number;
  penaltyBps: number;
  hoursUntilStart: number;
  band: "free" | "late" | "no_show" | "full";
};

function clampBps(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10_000, Math.round(value)));
}

function clampHours(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_REFUND_POLICY.freeCancelHours;
  return Math.max(0, Math.min(24 * 30, Math.round(value)));
}

export function parseRefundPolicy(raw: string | null | undefined): RefundPolicy {
  const base = { ...DEFAULT_REFUND_POLICY };
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<RefundPolicy>;
    return {
      paystackRefundsEnabled: parsed.paystackRefundsEnabled !== false,
      adminRefundsEnabled: parsed.adminRefundsEnabled !== false,
      customerCancelEnabled: parsed.customerCancelEnabled !== false,
      autoRefundOnCancel: Boolean(parsed.autoRefundOnCancel),
      vendorCancelQueuesRefund: parsed.vendorCancelQueuesRefund !== false,
      freeCancelHours: clampHours(Number(parsed.freeCancelHours ?? base.freeCancelHours)),
      latePenaltyBps: clampBps(Number(parsed.latePenaltyBps ?? base.latePenaltyBps)),
      noShowPenaltyBps: clampBps(Number(parsed.noShowPenaltyBps ?? base.noShowPenaltyBps)),
      minRefundKobo: Math.max(0, Math.min(1_000_000, Math.round(Number(parsed.minRefundKobo ?? base.minRefundKobo) || 0)))
    };
  } catch {
    return base;
  }
}

export function quoteCancellationRefund(
  policy: RefundPolicy,
  customerTotalKobo: number,
  startsAt: Date,
  now = new Date(),
  kind: RefundQuoteKind = "cancel"
): RefundQuote {
  const total = Math.max(0, Math.round(customerTotalKobo));
  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / 36e5;
  let penaltyBps = 0;
  let band: RefundQuote["band"] = "full";
  if (kind === "late_charge") {
    penaltyBps = 0;
    band = "full";
  } else if (kind === "no_show" || hoursUntilStart <= 0) {
    penaltyBps = policy.noShowPenaltyBps;
    band = "no_show";
  } else if (hoursUntilStart >= policy.freeCancelHours) {
    penaltyBps = 0;
    band = "free";
  } else {
    penaltyBps = policy.latePenaltyBps;
    band = "late";
  }
  let refundKobo = Math.round((total * (10_000 - penaltyBps)) / 10_000);
  refundKobo = Math.max(0, Math.min(total, refundKobo));
  if (refundKobo > 0 && refundKobo < policy.minRefundKobo) refundKobo = 0;
  return {
    refundKobo,
    penaltyKobo: total - refundKobo,
    penaltyBps,
    hoursUntilStart,
    band
  };
}
