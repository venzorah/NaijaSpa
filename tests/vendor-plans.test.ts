import { describe, expect, it } from "vitest";
import { LIVE_VENDOR_PLANS, vendorPlanBillingLabel } from "../src/lib/vendor-plans";

describe("vendor listing plans", () => {
  it("keeps Free at ₦0 with 10% commission and paid Silver Gold Platinum fees", () => {
    expect(LIVE_VENDOR_PLANS.map((p) => p.code)).toEqual(["FREE", "SILVER", "GOLD", "PLATINUM"]);
    const free = LIVE_VENDOR_PLANS[0];
    expect(free.priceKobo).toBe(0);
    expect(free.commissionBps).toBe(1000);
    expect(LIVE_VENDOR_PLANS[1]).toMatchObject({ name: "Silver", billing: "weekly", priceKobo: 5_000_000, durationDays: 7 });
    expect(LIVE_VENDOR_PLANS[2]).toMatchObject({ name: "Gold", billing: "monthly", priceKobo: 18_000_000, durationDays: 30 });
    expect(LIVE_VENDOR_PLANS[3]).toMatchObject({ name: "Platinum", billing: "yearly", priceKobo: 51_000_000, durationDays: 365 });
    expect(vendorPlanBillingLabel(7, 5_000_000)).toBe("Billed weekly");
    expect(vendorPlanBillingLabel(36500, 0)).toBe("No subscription fee");
  });
});
