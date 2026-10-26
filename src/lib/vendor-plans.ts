/** Vendor listing plans (not customer Memberships & promos). Prices are naira defaults; admin may change them. */
export const LIVE_VENDOR_PLANS = [
  {
    code: "FREE",
    name: "Free",
    billing: "none" as const,
    durationDays: 36500,
    priceKobo: 0,
    commissionBps: 1000,
    publicDirectContact: false,
    enhancedVisibility: false,
    sponsoredEligible: false
  },
  {
    code: "SILVER",
    name: "Silver",
    billing: "weekly" as const,
    durationDays: 7,
    priceKobo: 5_000_000,
    commissionBps: 0,
    publicDirectContact: true,
    enhancedVisibility: true,
    sponsoredEligible: true
  },
  {
    code: "GOLD",
    name: "Gold",
    billing: "monthly" as const,
    durationDays: 30,
    priceKobo: 18_000_000,
    commissionBps: 0,
    publicDirectContact: true,
    enhancedVisibility: true,
    sponsoredEligible: true
  },
  {
    code: "PLATINUM",
    name: "Platinum",
    billing: "yearly" as const,
    durationDays: 365,
    priceKobo: 51_000_000,
    commissionBps: 0,
    publicDirectContact: true,
    enhancedVisibility: true,
    sponsoredEligible: true
  }
] as const;

export const LEGACY_VENDOR_PLAN_CODES: Record<string, string> = {
  WEEKLY: "SILVER",
  MONTHLY: "GOLD",
  SIX_MONTH: "PLATINUM"
};

export type VendorPlanBilling = "none" | "weekly" | "monthly" | "yearly";

export function durationDaysFromBilling(billing: VendorPlanBilling) {
  if (billing === "weekly") return 7;
  if (billing === "monthly") return 30;
  if (billing === "yearly") return 365;
  return 36500;
}

export function billingFromDurationDays(durationDays: number, priceKobo: number): VendorPlanBilling {
  if (priceKobo <= 0 || durationDays >= 3650) return "none";
  if (durationDays <= 8) return "weekly";
  if (durationDays <= 45) return "monthly";
  return "yearly";
}

export function vendorPlanBillingLabel(durationDays: number, priceKobo: number) {
  const billing = billingFromDurationDays(durationDays, priceKobo);
  if (billing === "none") return "No subscription fee";
  if (billing === "weekly") return "Billed weekly";
  if (billing === "monthly") return "Billed monthly";
  return "Billed yearly";
}
