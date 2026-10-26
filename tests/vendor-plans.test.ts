import { describe, expect, it } from "vitest";
import { canonicalVendorPlanCode, vendorPlanCta, vendorPlanPerks } from "../src/lib/vendor-plans";

const free = {
  code: "FREE",
  name: "Free",
  priceKobo: 0,
  durationDays: 36500,
  commissionBps: 1000,
  publicDirectContact: false,
  enhancedVisibility: false,
  sponsoredEligible: false
};

const gold = {
  code: "GOLD",
  name: "Gold",
  priceKobo: 18_000_000,
  durationDays: 30,
  commissionBps: 0,
  publicDirectContact: true,
  enhancedVisibility: true,
  sponsoredEligible: true
};

const platinum = { ...gold, code: "PLATINUM", name: "Platinum", priceKobo: 51_000_000, durationDays: 365 };

describe("vendor listing plans", () => {
  it("keeps Free contact private and paid contact public", () => {
    expect(vendorPlanPerks(free).some((p) => /private/i.test(p))).toBe(true);
    expect(vendorPlanPerks(gold).some((p) => /Instagram/i.test(p))).toBe(true);
  });

  it("maps legacy weekly/monthly codes onto live paid plans", () => {
    expect(canonicalVendorPlanCode("weekly")).toBe("SILVER");
    expect(canonicalVendorPlanCode("MONTHLY")).toBe("GOLD");
    expect(canonicalVendorPlanCode("platinum")).toBe("PLATINUM");
  });

  it("labels subscribe vs upgrade vs current", () => {
    expect(vendorPlanCta(free, { code: "FREE", priceKobo: 0 }).kind).toBe("current");
    expect(vendorPlanCta(gold, { code: "FREE", priceKobo: 0 }).kind).toBe("subscribe");
    expect(vendorPlanCta(platinum, { code: "GOLD", priceKobo: gold.priceKobo }).kind).toBe("upgrade");
    expect(vendorPlanCta(gold, { code: "GOLD", priceKobo: gold.priceKobo }).kind).toBe("current");
  });
});
