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
    <div className="vendor-page-header mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="flex min-w-0 w-full flex-1 items-start gap-3">
        {hideBack ? null : (
          <NavBackButton
            fallback="/vendor/dashboard"
            className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink hover:bg-elev"
          />
        )}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-goldink">{eyebrow}</p> : null}
          <h1 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink2 sm:text-base">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </div>
  );
}
