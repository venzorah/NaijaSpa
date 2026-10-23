import { applyBps } from "./money";

export const LOCATION_SPA = "spa";
export const LOCATION_HOTEL = "hotel";
export const LOCATION_HOME = "home";

export type LocationType = typeof LOCATION_SPA | typeof LOCATION_HOTEL | typeof LOCATION_HOME;

export type SurchargeRecipient = "vendor" | "platform" | "split";

export interface CommercialConfig {
  spaSurchargeKobo: number;
  hotelSurchargeKobo: number;
  homeSurchargeKobo: number;
  surchargeRecipient: SurchargeRecipient;
  freeCommissionBps: number;
  paidCommissionBps: number;
  graceDays: number;
}

export const DEFAULT_COMMERCIAL: CommercialConfig = {
  spaSurchargeKobo: 0,
  hotelSurchargeKobo: 1_000_000,
  homeSurchargeKobo: 1_000_000,
  surchargeRecipient: "vendor",
  freeCommissionBps: 1000,
  paidCommissionBps: 0,
  graceDays: 3
};

export interface Entitlement {
  planCode: string;
  commissionBps: number;
  publicDirectContact: boolean;
  enhancedVisibility: boolean;
  sponsoredEligible: boolean;
  unlimitedListings: boolean;
  activePaid: boolean;
}

export const FREE_ENTITLEMENT: Entitlement = {
  planCode: "FREE",
  commissionBps: 1000,
  publicDirectContact: false,
  enhancedVisibility: false,
  sponsoredEligible: false,
  unlimitedListings: true,
  activePaid: false
};

export function entitlementFromPlan(
  plan: {
    code: string;
    commissionBps: number;
    publicDirectContact: boolean;
    enhancedVisibility: boolean;
    sponsoredEligible: boolean;
    unlimitedListings: boolean;
  },
  now: Date,
  sub?: { status: string; startsAt: Date; endsAt: Date; graceUntil: Date | null; source: string }
): Entitlement {
  const paidActive =
    !!sub &&
    sub.status === "active" &&
    plan.code !== "FREE" &&
    now >= sub.startsAt &&
    (now <= sub.endsAt || (!!sub.graceUntil && now <= sub.graceUntil));

  if (!paidActive) return { ...FREE_ENTITLEMENT, unlimitedListings: true };

  return {
    planCode: plan.code,
    commissionBps: plan.commissionBps,
    publicDirectContact: plan.publicDirectContact,
    enhancedVisibility: plan.enhancedVisibility,
    sponsoredEligible: plan.sponsoredEligible,
    unlimitedListings: true,
    activePaid: true
  };
}

export function surchargeFor(location: LocationType, cfg: CommercialConfig): number {
  if (location === LOCATION_HOTEL) return cfg.hotelSurchargeKobo;
  if (location === LOCATION_HOME) return cfg.homeSurchargeKobo;
  return cfg.spaSurchargeKobo;
}

export interface QuoteInput {
  basePriceKobo: number;
  location: LocationType;
  addonKobo?: number;
  discountKobo?: number;
  feesKobo?: number;
  entitlement: Entitlement;
  config: CommercialConfig;
}

export interface Quote {
  currency: "NGN";
  basePriceKobo: number;
  surchargeKobo: number;
  addonKobo: number;
  discountKobo: number;
  feesKobo: number;
  commissionBps: number;
  commissionKobo: number;
  customerTotalKobo: number;
  vendorPayableKobo: number;
  surchargeRecipient: SurchargeRecipient;
  planCode: string;
}

export function quoteBooking(input: QuoteInput): Quote {
  const addonKobo = input.addonKobo ?? 0;
  const discountKobo = input.discountKobo ?? 0;
  const feesKobo = input.feesKobo ?? 0;
  const surchargeKobo = surchargeFor(input.location, input.config);
  const commissionBps = input.entitlement.activePaid
    ? input.config.paidCommissionBps
    : input.config.freeCommissionBps;
  const commissionKobo = applyBps(input.basePriceKobo, commissionBps);
  const customerTotalKobo = input.basePriceKobo + surchargeKobo + addonKobo + feesKobo - discountKobo;
  if (customerTotalKobo < 0) {
    throw new Error("Invalid total");
  }
  const surchargeToVendor = input.config.surchargeRecipient === "platform" ? 0 : surchargeKobo;
  const vendorPayableKobo = input.basePriceKobo - commissionKobo + surchargeToVendor + addonKobo;
  return {
    currency: "NGN",
    basePriceKobo: input.basePriceKobo,
    surchargeKobo,
    addonKobo,
    discountKobo,
    feesKobo,
    commissionBps,
    commissionKobo,
    customerTotalKobo,
    vendorPayableKobo,
    surchargeRecipient: input.config.surchargeRecipient,
    planCode: input.entitlement.planCode
  };
}

export function publicContactAllowed(entitlement: Entitlement): boolean {
  return entitlement.publicDirectContact && entitlement.activePaid;
}

export function toWhatsAppLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  let intl = digits;
  if (digits.startsWith("0") && digits.length === 11) intl = `234${digits.slice(1)}`;
  if (digits.length === 10) intl = `234${digits}`;
  if (!intl.startsWith("234") && !intl.startsWith("1")) return null;
  return `https://wa.me/${intl}`;
}

export function sanitizePublicVendor<T extends { privatePhone?: string | null; privateWhatsapp?: string | null }>(
  vendor: T,
  entitlement: Entitlement
) {
  const allow = publicContactAllowed(entitlement);
  const phone = allow ? vendor.privatePhone ?? null : null;
  const whatsapp = allow ? toWhatsAppLink(vendor.privateWhatsapp) : null;
  const { privatePhone: _p, privateWhatsapp: _w, entitlement: _e, ...rest } = vendor as T & {
    entitlement?: unknown;
  };
  return {
    ...rest,
    publicPhone: phone && allow ? phone : null,
    publicWhatsapp: whatsapp,
    publicDirectContact: Boolean(phone || whatsapp)
  };
}
