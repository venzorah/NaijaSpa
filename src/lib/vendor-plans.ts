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

export function defaultVendorListingPlans(): VendorListingPlanView[] {
  return LIVE_VENDOR_PLANS.map((p) => ({
    code: p.code,
    name: p.name,
    priceKobo: p.priceKobo,
    durationDays: p.durationDays,
    commissionBps: p.commissionBps,
    publicDirectContact: p.publicDirectContact,
    enhancedVisibility: p.enhancedVisibility,
    sponsoredEligible: p.sponsoredEligible
  }));
}

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

export type VendorListingPlanView = {
  code: string;
  name: string;
  priceKobo: number;
  durationDays: number;
  commissionBps: number;
  publicDirectContact: boolean;
  enhancedVisibility: boolean;
  sponsoredEligible: boolean;
};

export function vendorPlanPerks(plan: VendorListingPlanView) {
  const commission = `${plan.commissionBps / 100}% commission on each successful booking`;
  if (plan.priceKobo <= 0 || plan.code === "FREE") {
    return [
      "No weekly, monthly or yearly listing fee",
      commission,
      "WhatsApp, email and Instagram stay private on Explore",
      "Customers still see contact on a paid booking",
      "Unlimited service listings"
    ];
  }
  return [
    vendorPlanBillingLabel(plan.durationDays, plan.priceKobo),
    commission,
    plan.publicDirectContact ? "Public WhatsApp, email and Instagram on your listing" : "Public contact hidden",
    plan.enhancedVisibility ? "Enhanced Explore visibility" : "Standard Explore placement",
    plan.sponsoredEligible ? "Eligible for sponsored placement" : "Sponsored placement not included",
    "Unlimited service listings"
  ];
}

export function vendorPlanCta(plan: VendorListingPlanView, current?: { code: string; priceKobo: number } | null) {
  const currentCode = current?.code || "FREE";
  const currentPrice = current?.priceKobo ?? 0;
  if (plan.code === currentCode) return { label: "Current plan", kind: "current" as const };
  if (plan.priceKobo <= 0) return { label: "Stay on Free", kind: "free" as const };
  if (currentPrice <= 0 || currentCode === "FREE") return { label: `Subscribe to ${plan.name}`, kind: "subscribe" as const };
  if (plan.priceKobo > currentPrice) return { label: `Upgrade to ${plan.name}`, kind: "upgrade" as const };
  return { label: `Switch to ${plan.name}`, kind: "switch" as const };
}
