"use client";

import Link from "@/components/navigation-link";
import { ExternalLink } from "lucide-react";

export function isHttpHref(href: string) {
  return /^https?:\/\//i.test(href);
}

const gold =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gold px-5 text-sm font-bold text-ongold";
const outline =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-gold/70 bg-gold/15 px-4 text-sm font-semibold text-goldink";
const ticker =
  "inline-flex max-w-[min(90vw,28rem)] items-center gap-2 rounded-full border border-gold/55 bg-gold/15 py-1 pl-3 pr-1 text-[12px] font-semibold tracking-wide text-gold";

export function AppLinkTab({
  href,
  label,
  variant = "gold"
}: {
  href: string;
  label: string;
  variant?: "gold" | "outline" | "ticker";
}) {
  const external = isHttpHref(href);
  const className = variant === "ticker" ? ticker : variant === "outline" ? outline : gold;
  return (
    <Link
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className={variant === "ticker" ? "truncate" : undefined}>{label}</span>
      {variant === "ticker" ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ongold">
          Open
        </span>
      ) : external ? (
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      ) : null}
      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
    </Link>
  );
}
