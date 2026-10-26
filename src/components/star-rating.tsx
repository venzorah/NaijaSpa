"use client";

import { Star } from "lucide-react";

const LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
  readOnly?: boolean;
}) {
  const dim = size === "sm" ? "h-4 w-4" : "h-8 w-8";
  return (
    <div className="flex items-center gap-1" role={readOnly ? "img" : "radiogroup"} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        if (readOnly) {
          return (
            <Star
              key={n}
              className={`${dim} ${on ? "fill-gold text-gold" : "text-line"}`}
              aria-hidden
            />
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}${LABELS[n - 1] ? `, ${LABELS[n - 1]}` : ""}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-elev"
            onClick={() => onChange?.(n)}
          >
            <Star className={`${dim} ${on ? "fill-gold text-gold" : "text-ink2"}`} aria-hidden />
          </button>
        );
      })}
      {!readOnly && value > 0 ? <span className="ml-1 text-sm font-semibold text-ink">{LABELS[value - 1]}</span> : null}
    </div>
  );
}
