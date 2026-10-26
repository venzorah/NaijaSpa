export type PublicVendorContactFields = {
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  publicEmail?: string | null;
  publicInstagram?: string | null;
};

export function hasPublicVendorContact(vendor: PublicVendorContactFields) {
  return Boolean(vendor.publicPhone || vendor.publicWhatsapp || vendor.publicEmail || vendor.publicInstagram);
}

export function pickPublicVendorContact(vendor: PublicVendorContactFields): PublicVendorContactFields {
  return {
    publicPhone: vendor.publicPhone ?? null,
    publicWhatsapp: vendor.publicWhatsapp ?? null,
    publicEmail: vendor.publicEmail ?? null,
    publicInstagram: vendor.publicInstagram ?? null
  };
}
