"use client";

import { cn } from "@/lib/cn";

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-elev p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium",
              active ? "bg-card text-ink shadow-sm ring-1 ring-gold/30" : "text-ink2 hover:text-ink"
            )}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span className={cn("rounded px-1 text-[10px] tabular-nums", active ? "bg-gold/15 text-goldink" : "bg-bg")}>
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
