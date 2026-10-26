import { describe, expect, it } from "vitest";
import {
  LIVE_MEMBERSHIP_PLANS,
  membershipPerks,
  monthlyRecurringKobo,
  parseBenefits,
  planCodeFromName,
  serializeBenefits
} from "../src/lib/membership";

describe("membership plans", () => {
  it("builds a unique code and stores benefits as lines", () => {
    expect(planCodeFromName("Silver", "monthly")).toBe("SILVER_MONTHLY");
    expect(planCodeFromName("Silver", "weekly")).toBe("SILVER_WEEKLY");
    expect(planCodeFromName("Free", "none")).toBe("FREE");
    expect(planCodeFromName("Gold plus", "yearly")).toBe("GOLD_PLUS_YEARLY");
    expect(parseBenefits('["5% off","Priority support"]')).toEqual(["5% off", "Priority support"]);
    expect(parseBenefits("5% off\nPriority support")).toEqual(["5% off", "Priority support"]);
    expect(serializeBenefits(["  5% off ", "Priority support"])).toBe("5% off\nPriority support");
    expect(monthlyRecurringKobo(12000000, "yearly")).toBe(1000000);
    expect(monthlyRecurringKobo(500000, "monthly")).toBe(500000);
    expect(monthlyRecurringKobo(500000, "weekly")).toBe(Math.round((500000 * 52) / 12));
    expect(monthlyRecurringKobo(0, "none")).toBe(0);
  });

  it("publishes Free plus Silver weekly, Gold monthly and Platinum yearly", () => {
    expect(LIVE_MEMBERSHIP_PLANS.map((p) => p.code)).toEqual(["FREE", "SILVER_MONTHLY", "GOLD_MONTHLY", "PLATINUM_YEARLY"]);
    expect(LIVE_MEMBERSHIP_PLANS[0]).toMatchObject({ name: "Free", interval: "none", priceKobo: 0 });
    expect(LIVE_MEMBERSHIP_PLANS[1]).toMatchObject({ name: "Silver", interval: "weekly", priceKobo: 500000 });
    expect(LIVE_MEMBERSHIP_PLANS[2]).toMatchObject({ name: "Gold", interval: "monthly", priceKobo: 1200000 });
    expect(LIVE_MEMBERSHIP_PLANS[3]).toMatchObject({ name: "Platinum", interval: "yearly", priceKobo: 12000000 });
    expect(membershipPerks("15% off bookings\nAll surcharges waived")).toEqual({
      bookingPercentOff: 15,
      waiveAllSurcharges: true,
      waiveHomeMonthly: false
    });
    expect(membershipPerks("Waived home surcharge once a month").waiveHomeMonthly).toBe(true);
  });
});
