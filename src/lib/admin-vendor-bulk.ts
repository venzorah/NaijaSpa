export const VENDOR_BULK_ACTIONS = ["approve", "suspend", "hide", "publish", "contact_on", "contact_off"] as const;
export type VendorBulkAction = (typeof VENDOR_BULK_ACTIONS)[number];

export function vendorBulkData(action: VendorBulkAction) {
  if (action === "approve") return { applicationStatus: "approved", visibility: "public", verificationStatus: "verified" };
  if (action === "suspend") return { applicationStatus: "suspended", visibility: "hidden" };
  if (action === "hide") return { visibility: "hidden" };
  if (action === "publish") return { visibility: "public" };
  if (action === "contact_on") return { publicContactEnabled: true };
  return { publicContactEnabled: false };
}

export function vendorBulkLabel(action: VendorBulkAction, count: number) {
  const n = `${count} vendor${count === 1 ? "" : "s"}`;
  if (action === "approve") return `Approved ${n}.`;
  if (action === "suspend") return `Suspended ${n}.`;
  if (action === "hide") return `Hid ${n} from Explore.`;
  if (action === "publish") return `Published ${n} to Explore.`;
  if (action === "contact_on") return `Turned public contact on for ${n}.`;
  return `Turned public contact off for ${n}.`;
}
