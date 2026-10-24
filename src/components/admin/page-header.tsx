import type { AdminScreenId } from "@/lib/admin";
import { ADMIN_SCREENS } from "@/lib/admin";

export function AdminPageHeader({
  screen,
  actions
}: {
  screen: AdminScreenId;
  actions?: React.ReactNode;
}) {
  const def = ADMIN_SCREENS.find((s) => s.id === screen);
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{def?.label ?? screen}</h1>
        {def?.description ? <p className="mt-1 text-base text-ink2">{def.description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
