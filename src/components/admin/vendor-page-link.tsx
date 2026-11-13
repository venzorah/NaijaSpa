"use client";

import { adminBtnOutline } from "@/components/admin/form-row";

export function AdminVendorPageLink({
  slug,
  children = "View spa page"
}: {
  vendorId?: string;
  slug: string;
  children?: string;
}) {
  return (
    <a
      href={`/go/v/${encodeURIComponent(slug)}?from=admin`}
      target="_blank"
      rel="noreferrer"
      className={adminBtnOutline}
    >
      {children}
    </a>
  );
}
