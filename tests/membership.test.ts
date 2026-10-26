import { describe, expect, it } from "vitest";
import { monthlyRecurringKobo, parseBenefits, planCodeFromName, serializeBenefits } from "../src/lib/membership";

describe("membership plans", () => {
  it("builds a unique code and stores benefits as lines", () => {
    expect(planCodeFromName("Silver", "monthly")).toBe("SILVER_MONTHLY");
    expect(planCodeFromName("Gold plus", "yearly")).toBe("GOLD_PLUS_YEARLY");
    expect(parseBenefits('["5% off","Priority support"]')).toEqual(["5% off", "Priority support"]);
    expect(parseBenefits("5% off\nPriority support")).toEqual(["5% off", "Priority support"]);
    expect(serializeBenefits(["  5% off ", "Priority support"])).toBe("5% off\nPriority support");
    expect(monthlyRecurringKobo(12000000, "yearly")).toBe(1000000);
    expect(monthlyRecurringKobo(500000, "monthly")).toBe(500000);
  });
});
