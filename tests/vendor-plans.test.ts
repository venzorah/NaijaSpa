import { describe, expect, it } from "vitest";
import { billingFromDurationDays, durationDaysFromBilling, vendorPlanBillingLabel } from "../src/lib/vendor-plans";

describe("vendor listing plans", () => {
  it("maps admin billing to package length", () => {
    expect(durationDaysFromBilling("none")).toBe(36500);
    expect(durationDaysFromBilling("weekly")).toBe(7);
    expect(durationDaysFromBilling("monthly")).toBe(30);
    expect(durationDaysFromBilling("yearly")).toBe(365);
  });

  it("labels Silver weekly Gold monthly Platinum yearly", () => {
    expect(vendorPlanBillingLabel(7, 5_000_000)).toBe("Billed weekly");
    expect(vendorPlanBillingLabel(30, 18_000_000)).toBe("Billed monthly");
    expect(vendorPlanBillingLabel(365, 51_000_000)).toBe("Billed yearly");
    expect(vendorPlanBillingLabel(36500, 0)).toBe("No subscription fee");
    expect(billingFromDurationDays(7, 5_000_000)).toBe("weekly");
  });
});
