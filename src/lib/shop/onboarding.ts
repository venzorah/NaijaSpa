export const SHOP_ONBOARDING_STEPS = [
  { id: "email", title: "Verify email" },
  { id: "business", title: "Business details" },
  { id: "kyc", title: "KYC documents" },
  { id: "store", title: "Store images" },
  { id: "submit", title: "Review & submit" }
] as const;

export const SHOP_ONBOARDING_HOME = "/vendor/shop/onboarding";
export const SHOP_PRODUCTS_HOME = "/vendor/shop/products";

export function shopBusinessReady(v: { businessName?: string | null; city?: string | null; address?: string | null }) {
  return (v.businessName ?? "").trim().length >= 2 && (v.city ?? "").trim().length >= 2 && (v.address ?? "").trim().length >= 4;
}

export function shopKycReady(docCount: number) {
  return docCount > 0;
}

export function shopStoreImagesReady(v: { logoUrl?: string | null; coverUrl?: string | null }) {
  return Boolean(v.logoUrl && v.coverUrl);
}

export function canDraftShopProducts(shopStatus: string | null | undefined) {
  return shopStatus === "pending" || shopStatus === "approved";
}

type ShopOnboardingSnapshot = {
  shopStatus?: string | null;
  businessName?: string | null;
  city?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  docCount: number;
  emailVerified?: boolean;
};

export function shopOnboardingComplete(v: ShopOnboardingSnapshot) {
  if (v.shopStatus === "approved") return true;
  return (
    Boolean(v.emailVerified) &&
    canDraftShopProducts(v.shopStatus) &&
    shopBusinessReady(v) &&
    shopKycReady(v.docCount) &&
    shopStoreImagesReady(v)
  );
}

export function inferShopOnboardingStep(v: ShopOnboardingSnapshot & { shopOnboardingStep?: number | null }) {
  if (shopOnboardingComplete(v)) return SHOP_ONBOARDING_STEPS.length;
  if (!v.emailVerified) return 0;
  if (!shopBusinessReady(v)) return 1;
  if (!shopKycReady(v.docCount)) return 2;
  if (!shopStoreImagesReady(v)) return 3;
  return 4;
}

export function shopOnboardingIncomplete(commerceKind: string | null | undefined, v: ShopOnboardingSnapshot) {
  if (commerceKind !== "products") return false;
  return !shopOnboardingComplete(v);
}
