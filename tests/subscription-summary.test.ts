import { expect, it } from "vitest";
import { subscriptionPeriodLabel, subscriptionSavings } from "../src/lib/subscription-summary";

it("counts only completed visits and compares actual commission to the Free rate", () => {
  expect(subscriptionSavings([
    { status: "completed", basePriceKobo: 100000, commissionKobo: 0 },
    { status: "completed", basePriceKobo: 200000, commissionKobo: 10000 },
    { status: "cancelled", basePriceKobo: 9999999, commissionKobo: 0 },
    { status: "awaiting_payment", basePriceKobo: 9999999, commissionKobo: 0 }
  ], 1000)).toEqual({ revenueKobo: 300000, savedKobo: 20000, count: 2 });
});
it("never invents negative or empty-month savings", () => {
  expect(subscriptionSavings([], 1000)).toEqual({ revenueKobo: 0, savedKobo: 0, count: 0 });
  expect(subscriptionSavings([{ status: "completed", basePriceKobo: 100000, commissionKobo: 20000 }], 1000).savedKobo).toBe(0);
});
it("displays the real billing duration rather than the demo's sample durations", () => {
  expect(subscriptionPeriodLabel(7, 5000000)).toBe("per week");
  expect(subscriptionPeriodLabel(30, 18000000)).toBe("per month");
  expect(subscriptionPeriodLabel(365, 51000000)).toBe("per year");
  expect(subscriptionPeriodLabel(180, 18000000)).toBe("per 180 days");
  expect(subscriptionPeriodLabel(36500, 0)).toBe("forever");
});
