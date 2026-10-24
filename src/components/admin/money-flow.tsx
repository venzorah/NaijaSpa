import { ChevronRight } from "lucide-react";
import { formatNgnCompact } from "@/lib/money";
import { cn } from "@/lib/cn";

export function MoneyFlow({
  gbv,
  collected,
  commission,
  refunds,
  subscriptionRevenue,
  membershipRevenue,
  sponsoredRevenue
}: {
  gbv: number;
  collected: number;
  commission: number;
  refunds: number;
  subscriptionRevenue: number;
  membershipRevenue: number;
  sponsoredRevenue: number;
}) {
  const platformRevenue = commission + subscriptionRevenue + membershipRevenue + sponsoredRevenue;
  const vendorPayable = collected - commission - refunds;
  const steps = [
    { label: "Gross booking value", tag: "GBV · not revenue", value: gbv, text: "Total value of bookings placed, including extras. Activity measure only." },
    { label: "Collected funds", tag: "Cash in · verified", value: collected, text: "Payments marked success by Paystack. Mostly owed to vendors." },
    { label: "Vendor payable", tag: "Liability", value: vendorPayable, text: "Collected booking funds minus commission and refunds." },
    { label: "Recognised platform revenue", tag: "Revenue", value: platformRevenue, text: "Commission + subscriptions + memberships + sponsored placements.", emphasis: true }
  ];
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Money flow from bookings to revenue">
      {steps.map((step, i) => (
        <li key={step.label} className={cn("relative rounded-lg border bg-bg/40 p-3", step.emphasis ? "border-gold/50 bg-gold/5" : "border-line")}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink2">
            {String(i + 1).padStart(2, "0")} · {step.tag}
          </span>
          <p className="mt-1.5 text-xs font-medium">{step.label}</p>
          <p className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", step.emphasis && "text-goldink")}>{formatNgnCompact(step.value)}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink2">{step.text}</p>
          {i < steps.length - 1 ? (
            <ChevronRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full border border-line bg-card p-0.5 text-ink2 xl:block" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
