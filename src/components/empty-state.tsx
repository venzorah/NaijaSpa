import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  actionHref,
  actionLabel
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card px-5 py-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-ink2" aria-hidden />
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink2">{text}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
