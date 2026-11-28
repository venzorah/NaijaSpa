export const SHOP_PLAN_FREE = "SHOP_FREE";
export const SHOP_PLAN_MONTHLY = "SHOP_MONTHLY";

export const DEFAULT_SHOP_PLANS = [
  { code: SHOP_PLAN_FREE, name: "Shop Free", durationDays: 3650, priceKobo: 0, commissionBps: 1000, featuredBoost: false },
  { code: SHOP_PLAN_MONTHLY, name: "Shop Monthly", durationDays: 30, priceKobo: 1_500_000, commissionBps: 500, featuredBoost: true }
] as const;

export const DEFAULT_SHOP_VENDOR_STATES = ["Lagos", "FCT", "Rivers"] as const;

export const SHOP_CATEGORIES = [
  { slug: "skincare-facial", name: "Skincare and Facial Products" },
  { slug: "body-care", name: "Body Care" },
  { slug: "massage-spa", name: "Massage and Spa Products" },
  { slug: "organic-natural", name: "Organic and Natural Products" },
  { slug: "hair-beauty", name: "Hair Care and Beauty Products" },
  { slug: "beauty-tools", name: "Beauty Tools and Accessories" },
  { slug: "aromatherapy", name: "Aromatherapy and Essential Oils" },
  { slug: "wellness-personal", name: "Wellness and Personal Care" },
  { slug: "bath-body", name: "Bath and Body Products" },
  { slug: "spa-supplies", name: "Professional Spa Supplies" },
  { slug: "beauty-enhancement", name: "Approved Beauty Enhancement Products" }
] as const;

export const SHOP_CONFIG = {
  vendorStates: "shop.vendorStates",
  settlementDays: "shop.settlementDays",
  minPayoutKobo: "shop.minPayoutKobo",
  payoutMode: "shop.payoutMode",
  orderSeq: "shop.orderSeq",
  hero: "shop.hero",
  productImageMaxBytes: "shop.productImageMaxBytes"
} as const;

export const LIVE_PRODUCT_STATUS = "approved";
