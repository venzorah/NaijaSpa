export const SHOP_PRODUCT_PUBLISHED = "approved";
export const SHOP_PRODUCT_DRAFT = "draft";
export const SHOP_PRODUCT_UNPUBLISHED = "unpublished";
export const SHOP_PRODUCT_ARCHIVED = "archived";

export type ShopProductSaveStatus = "draft" | "pending" | "approved" | "unpublished";
export function shopProductListingLabel(status: string) {
  if (status === "approved") return "Published";
  if (status === "unpublished") return "Unpublished";
  if (status === "archived") return "Deleted";
  if (status === "draft") return "Draft";
  if (status === "pending") return "Pending review";
  if (status === "rejected") return "Rejected";
  if (status === "suspended") return "Suspended";
  return status.replace(/_/g, " ");
}

export function shopProductEditStatus(current: string): ShopProductSaveStatus {
  if (current === "approved" || current === "unpublished" || current === "draft" || current === "pending") return current;
  return "draft";
}

export function shopProductSaveStatus(opts: {
  intent?: "draft" | "publish";
  existing?: string;
  fallback?: ShopProductSaveStatus;
}): ShopProductSaveStatus {
  if (opts.intent === "publish") return "approved";
  if (opts.intent === "draft") return "draft";
  if (opts.existing) return shopProductEditStatus(opts.existing);
  return opts.fallback ?? "draft";
}
