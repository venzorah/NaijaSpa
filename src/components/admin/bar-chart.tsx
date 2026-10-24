import { cn } from "@/lib/cn";

export function MiniBars({
  series,
  className
}: {
  series: { label: string; values: { key: string; value: number; className?: string }[] }[];
  className?: string;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v.value)));
  return (
    <div
      className={cn("grid items-end gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${Math.max(1, series.length)}, minmax(0, 1fr))` }}
      role="img"
      aria-label="Chart"
    >
      {series.map((col) => (
        <div key={col.label} className="flex flex-col items-center gap-1">
          <div className="flex h-28 w-full items-end justify-center gap-0.5">
            {col.values.map((v) => (
              <div
                key={v.key}
                className={cn("w-2 rounded-t bg-gold/70", v.className)}
                style={{ height: `${Math.max(4, (v.value / max) * 100)}%` }}
                title={`${v.key}: ${v.value}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-ink2">{col.label}</span>
        </div>
      ))}
    </div>
  );
}
