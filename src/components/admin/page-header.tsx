"use client";

import { NavBackButton } from "@/components/nav-history";
import type { AdminScreenId } from "@/lib/admin";
import { ADMIN_SCREENS } from "@/lib/admin";

export function AdminPageHeader({
  screen,
  actions,
  hideBack = false
}: {
  screen: AdminScreenId;
  actions?: React.ReactNode;
  hideBack?: boolean;
}) {
  const def = ADMIN_SCREENS.find((s) => s.id === screen);
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {hideBack ? null : (
          <NavBackButton
            fallback="/admin/dashboard"
            className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink hover:bg-elev"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight">{def?.label ?? screen}</h1>
          {def?.description ? <p className="mt-1 text-base text-ink2">{def.description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
