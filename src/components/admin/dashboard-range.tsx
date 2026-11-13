import Link from "next/link";
import {
  adminDashboardHref,
  type AdminDashboardRange
} from "@/lib/admin-dashboard";
import { cn } from "@/lib/cn";

const OPTIONS: { value: AdminDashboardRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" }
];

export function DashboardRange({ value }: { value: AdminDashboardRange }) {
  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-elev p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Link
            key={opt.value}
            href={adminDashboardHref(opt.value)}
            prefetch={false}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium",
              active ? "bg-card text-ink shadow-sm ring-1 ring-gold/30" : "text-ink2 hover:text-ink"
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
