"use client";

import { NavBackButton } from "@/components/nav-history";

export function VendorPageHeader({
  title,
  description,
  eyebrow,
  actions,
  hideBack = false
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  hideBack?: boolean;
}) {
  return (
    <div className="vendor-page-header mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {hideBack ? null : (
          <NavBackButton
            fallback="/vendor/dashboard"
            className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink hover:bg-elev"
          />
        )}
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-goldink">{eyebrow}</p> : null}
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-base text-ink2">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
