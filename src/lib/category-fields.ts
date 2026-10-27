/** Scalar fields that exist on Category even before the imagePayload migration. */
export const categoryAdminSelect = {
  id: true,
  slug: true,
  name: true,
  synonyms: true,
  description: true,
  metaTitle: true,
  metaDescription: true,
  imageUrl: true,
  sortOrder: true,
  active: true,
  archivedAt: true,
  services: { select: { vendorId: true } }
} as const;

export const categoryAuditSelect = {
  id: true,
  slug: true,
  name: true,
  synonyms: true,
  description: true,
  metaTitle: true,
  metaDescription: true,
  imageUrl: true,
  sortOrder: true,
  active: true,
  archivedAt: true
} as const;
