import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { formatNgn } from "@/lib/money";
import { vendorPlanBillingLabel, vendorPlanPerks, type VendorListingPlanView } from "@/lib/vendor-plans";
import { cn } from "@/lib/cn";

export function ListingPlanCard({
  plan,
  selected,
  badge,
  tone = "light",
  children
}: {
  plan: VendorListingPlanView;
  selected?: boolean;
  badge?: string;
  tone?: "light" | "dark";
  children?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-3xl border p-5",
        dark ? "border-white/15 bg-white/[0.04] text-white" : "border-line bg-card",
        selected && (dark ? "border-gold/70" : "border-gold/50")
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn("font-display text-2xl font-semibold", dark ? "text-white" : "text-ink")}>{plan.name}</h3>
        {badge ? (
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-goldink">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1">
        <span className={cn("text-3xl font-bold", dark ? "text-white" : "text-ink")}>
          {plan.priceKobo <= 0 ? "₦0" : formatNgn(plan.priceKobo)}
        </span>{" "}
        <span className={cn("text-sm", dark ? "text-white/65" : "text-ink2")}>
          {vendorPlanBillingLabel(plan.durationDays, plan.priceKobo).toLowerCase()}
        </span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {vendorPlanPerks(plan).map((perk) => (
          <li key={perk} className={cn("flex items-start gap-2 text-sm", dark ? "text-white/75" : "text-ink2")}>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-goldink" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
      {children}
    </article>
  );
}
