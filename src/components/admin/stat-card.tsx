import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  definition,
  emphasis
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  icon?: LucideIcon;
  definition?: string;
  emphasis?: "gold" | "none";
}) {
  const positive = delta !== undefined && delta >= 0;
  return (
    <div className={cn("relative rounded-xl border bg-card p-4 shadow-sm", emphasis === "gold" ? "border-gold/40" : "border-line")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink2">
          {label}
          {definition ? (
            <span className="group relative inline-flex">
              <button type="button" className="rounded text-ink2 hover:text-ink" aria-label={`Definition: ${definition}`}>
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-60 -translate-x-1/2 rounded-md border border-line bg-elev p-2 text-[11px] font-normal leading-relaxed text-ink shadow-lg group-hover:block group-focus-within:block"
              >
                {definition}
              </span>
            </span>
          ) : null}
        </div>
        {Icon ? <Icon className={cn("h-4 w-4", emphasis === "gold" ? "text-goldink" : "text-ink2")} aria-hidden /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined ? (
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", positive ? "text-forest" : "text-red-600 dark:text-red-300")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {sub ? <span className="truncate text-ink2">{sub}</span> : null}
      </div>
    </div>
  );
}
