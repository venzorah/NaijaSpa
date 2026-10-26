import { applyBps } from "./money";
import { paidUntilMs } from "./subscription-renewal";

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
  hotelSurchargeKobo: 0,
  homeSurchargeKobo: 0,
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
  sub?: { status: string; startsAt: Date; endsAt: Date; graceUntil: Date | null; source: string },
  graceDays = 0
): Entitlement {
  const paidActive =
    !!sub &&
    (sub.status === "active" || sub.status === "grace") &&
    plan.code !== "FREE" &&
    now >= sub.startsAt &&
    now.getTime() <= paidUntilMs(sub.endsAt, sub.graceUntil, graceDays);

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

/** Vendor-set Hotel/Home add-on. Spa/Office is always ₦0 extra. */
export function locationAddonKobo(
  location: LocationType,
  service: { hotelAddonKobo?: number | null; homeAddonKobo?: number | null }
): number {
  if (location === LOCATION_HOTEL) return Math.max(0, service.hotelAddonKobo ?? 0);
  if (location === LOCATION_HOME) return Math.max(0, service.homeAddonKobo ?? 0);
  return 0;
}

export interface QuoteInput {
  basePriceKobo: number;
  location: LocationType;
  addonKobo?: number;
  locationAddonKobo?: number;
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
  const locationAddon = Math.max(0, input.locationAddonKobo ?? 0);
  const surchargeKobo = locationAddon;
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

/** Phone/WhatsApp unlock only after a successful booking payment. */
export function bookingUnlocksVendorContact(status: string, paymentSucceeded: boolean) {
  if (!paymentSucceeded) return false;
  return status === "confirmed" || status === "in_progress" || status === "completed";
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

export function toInstagramLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;
  const handle = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "").split(/[?#]/)[0];
  if (!handle || !/^[\w.]+$/.test(handle)) {
    if (/^https:\/\/(www\.)?instagram\.com\//i.test(value)) return value.split(/[?#]/)[0];
    return null;
  }
  return `https://www.instagram.com/${handle}`;
}

export function sanitizePublicVendor<T extends {
  privatePhone?: string | null;
  privateWhatsapp?: string | null;
  instagramUrl?: string | null;
  owner?: { email?: string | null } | null;
}>(vendor: T, entitlement?: Entitlement) {
  const allow = entitlement ? publicContactAllowed(entitlement) : false;
  const {
    privatePhone,
    privateWhatsapp,
    instagramUrl,
    owner,
    entitlement: _e,
    galleries: _galleries,
    services: _services,
    videoLinks: _videoLinks,
    documents: _documents,
    ...rest
  } = vendor as T & {
    entitlement?: unknown;
    galleries?: unknown;
    services?: unknown;
    videoLinks?: unknown;
    documents?: unknown;
  };
  const phone = allow ? privatePhone ?? null : null;
  const whatsapp = allow ? toWhatsAppLink(privateWhatsapp) : null;
  const email = allow ? owner?.email?.trim() || null : null;
  const instagram = allow ? toInstagramLink(instagramUrl) : null;
  return {
    ...rest,
    publicPhone: phone,
    publicWhatsapp: whatsapp,
    publicEmail: email,
    publicInstagram: instagram,
    publicDirectContact: Boolean(phone || whatsapp || email || instagram)
  };
}
