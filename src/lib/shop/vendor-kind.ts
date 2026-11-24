const SERVICE_VENDOR_PREFIXES = [
  "/vendor/bookings",
  "/vendor/availability",
  "/vendor/listing",
  "/vendor/services",
  "/vendor/staff",
  "/vendor/subscriptions",
  "/vendor/analytics",
  "/vendor/campaigns",
  "/vendor/earnings",
  "/vendor/chats"
];

export function isProductOnlyVendor(commerceKind: string | null | undefined) {
  return commerceKind === "products";
}

export function sellsTreatments(commerceKind: string | null | undefined) {
  return commerceKind !== "products";
}

export function sellsShopProducts(commerceKind: string | null | undefined) {
  return commerceKind === "products" || commerceKind === "both";
}

export function productVendorServicePath(path: string) {
  const pathname = path.split("?")[0] || path;
  return SERVICE_VENDOR_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
