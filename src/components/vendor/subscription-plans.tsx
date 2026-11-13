import Link from "next/link";
import { Check, Info, Minus } from "lucide-react";
import { formatNgn } from "@/lib/money";
import { vendorPlanCta, vendorPlanPerks, type VendorListingPlanView } from "@/lib/vendor-plans";
import { subscriptionPeriodLabel } from "@/lib/subscription-summary";

const description = (plan: VendorListingPlanView) => plan.priceKobo <= 0
  ? "List your services and take bookings through NaijaSpa."
  : `${plan.commissionBps === 0 ? "Keep 100% of service revenue" : "Grow your business"} with ${subscriptionPeriodLabel(plan.durationDays, plan.priceKobo).replace("per ", "")} billing.`;

export function SubscriptionPlans({ plans, current, canPay }: {
  plans: VendorListingPlanView[];
  current: { code: string; priceKobo: number };
  canPay: boolean;
}) {
  const free = plans.find(plan => plan.code === "FREE");
  const paid = plans.filter(plan => plan.priceKobo > 0);
  const signature = (plan: VendorListingPlanView) => [plan.commissionBps, plan.publicDirectContact, plan.enhancedVisibility, plan.sponsoredEligible].join(":");
  const uniformPaid = paid.length > 0 && paid.every(plan => signature(plan) === signature(paid[0]));
  const columns = uniformPaid
    ? [...(free ? [{ label: free.name, plan: free }] : []), { label: "Paid (all durations)", plan: paid[0] }]
    : plans.map(plan => ({ label: plan.name, plan }));
  const features: { label: string; value: (plan: VendorListingPlanView) => string | boolean }[] = [
    { label: "Unlimited service listings", value: () => true },
    { label: "Booking commission", value: plan => `${plan.commissionBps / 100}%` },
    { label: "Public contact on Explore", value: () => "Hidden unless NaijaSpa turns it on" },
    { label: "Search visibility", value: plan => plan.enhancedVisibility ? "Enhanced" : "Standard" },
    { label: "Eligible for sponsored placements", value: plan => plan.sponsoredEligible },
    { label: "Booking analytics", value: () => "Included" },
    { label: "Staff schedules & availability", value: () => true },
    { label: "Payouts to a Nigerian bank account", value: () => true }
  ];
  return <div>
    <h2 className="subscription-section-title mb-3">Compare plans</h2>
    <p className="mb-3 flex items-start gap-2 rounded-lg bg-elev px-3 py-2 text-[11px] text-ink2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Listing plan prices and benefits are set by NaijaSpa. All amounts are in naira.</p>
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {plans.map(plan => {
        const cta = vendorPlanCta(plan, current);
        const selected = cta.kind === "current";
        const perks = vendorPlanPerks(plan).map((label) => ({ label, included: true }));
        return <li key={plan.code} className="min-w-0">
          <article aria-label={`${plan.name} plan`} className={`flex h-full flex-col rounded-xl border bg-card p-5 ${selected ? "border-gold ring-1 ring-gold/20" : "border-line"}`}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{plan.name}</h3>{selected ? <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-goldink">Current</span> : null}</div>
            <p className="mt-2 min-h-10 text-xs leading-relaxed text-ink2">{description(plan)}</p>
            <p className="subscription-price mt-4">{formatNgn(plan.priceKobo)}</p>
            <p className="mt-0.5 text-[11px] text-ink2">{subscriptionPeriodLabel(plan.durationDays, plan.priceKobo)}</p>
            <ul className="mb-6 mt-4 flex-1 space-y-3">{perks.map(perk => <li key={perk.label} className="flex items-start gap-2 text-xs font-medium">{perk.included ? <Check className="h-4 w-4 shrink-0 text-leaf" aria-hidden /> : <Minus className="h-4 w-4 shrink-0 text-ink2" aria-hidden />}{perk.label}</li>)}</ul>
            {selected ? <p className="rounded-lg border border-line px-3 py-2 text-center text-xs font-semibold text-ink2">Current plan</p>
              : cta.kind === "free" ? <p className="rounded-lg border border-line px-3 py-2 text-center text-xs text-ink2">Free after your paid period ends</p>
                : canPay ? <Link href={`/vendor/subscriptions/checkout?plan=${encodeURIComponent(plan.code)}`} className="rounded-lg border border-line px-3 py-2 text-center text-xs font-semibold transition hover:border-gold/60 hover:bg-gold/10">{current.priceKobo > 0 ? "Switch plan" : "Subscribe"}</Link>
                  : <p className="rounded-lg border border-line px-3 py-2 text-center text-xs text-ink2">Owner access required</p>}
          </article>
        </li>;
      })}
    </ul>
    {!plans.length ? <p className="rounded-xl border border-line bg-card p-8 text-center text-sm text-ink2">No listing plans are available right now. Please contact support.</p> : null}
    {columns.length ? <section className="relative mt-4 overflow-hidden rounded-xl border border-line bg-card"><div className="relative overflow-x-auto"><table className="min-w-[560px]"><caption className="sr-only">Listing plan feature comparison</caption><thead><tr><th>Feature</th>{columns.map(column => <th key={column.label} className="!text-center">{column.label}</th>)}</tr></thead><tbody>{features.map(feature => <tr key={feature.label}><td className="font-medium">{feature.label}</td>{columns.map(column => { const value = feature.value(column.plan); return <td key={column.label} className="text-center text-xs">{typeof value === "boolean" ? value ? <><Check className="mx-auto h-4 w-4 text-leaf" aria-hidden /><span className="sr-only">Included</span></> : <><Minus className="mx-auto h-4 w-4 text-ink2" aria-hidden /><span className="sr-only">Not included</span></> : value}</td>; })}</tr>)}</tbody></table></div></section> : null}
  </div>;
}
