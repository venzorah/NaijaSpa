import Link from "next/link";
import { Crown, RefreshCw } from "lucide-react";
import { requireVendor } from "@/lib/vendor-auth";
import { getCommercialConfig, prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { listPublicVendorPlans } from "@/lib/vendor-plans-live";
import { calendarDaysUntil, renewalNoticeDays } from "@/lib/subscription-renewal";
import { subscriptionPeriodLabel, subscriptionSavings } from "@/lib/subscription-summary";
import { formatNgn } from "@/lib/money";
import { ROLES } from "@/lib/rbac";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { BillingHistoryButton } from "@/components/vendor/billing-history";
import { SubscriptionPlans } from "@/components/vendor/subscription-plans";
import "@/components/vendor/subscription.css";

const date = (value: Date) => value.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export default async function Page({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const user = await requireVendor();
  const { billing } = await searchParams;
  const now = new Date();
  const local = new Date(now.getTime() + 3600000);
  const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 3600000);
  const nextMonth = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 3600000);
  const [plans, ent, config, bookings] = await Promise.all([
    listPublicVendorPlans(), vendorEntitlement(user.vendorId), getCommercialConfig(),
    prisma.booking.findMany({
      where: { vendorId: user.vendorId, startsAt: { gte: monthStart, lt: nextMonth }, status: "completed" },
      select: { status: true, basePriceKobo: true, commissionKobo: true }
    })
  ]);
  // Resolve the subscription after entitlement reconciliation can expire an old period.
  const current = await prisma.vendorSubscription.findFirst({
    where: { vendorId: user.vendorId, status: { in: ["active", "grace"] } },
    include: { plan: true }, orderBy: { endsAt: "desc" }
  });
  const paidCurrent = ent.activePaid && current && current.plan.code !== "FREE" && current.endsAt.getUTCFullYear() < 9000 ? current : null;
  const daysLeft = paidCurrent ? calendarDaysUntil(paidCurrent.endsAt) : null;
  const showRenewal = daysLeft != null && paidCurrent && daysLeft <= Math.max(...renewalNoticeDays(paidCurrent.plan.durationDays), 0);
  const currentPlan = current?.plan ?? plans.find(plan => plan.code === ent.planCode);
  const canPay = user.role === ROLES.VENDOR_OWNER;
  const savings = subscriptionSavings(bookings, config.freeCommissionBps);
  const fee = paidCurrent?.plan.priceKobo ?? 0;
  const progress = fee > 0 ? Math.min(100, Math.round(savings.savedKobo / fee * 100)) : 0;
  const name = currentPlan?.name ?? (ent.activePaid ? ent.planCode : "Free");

  return <div className="subscription-page">
    <VendorPageHeader title="Subscription" description="Free forever, or choose a paid plan for enhanced visibility and public contact." actions={<BillingHistoryButton initiallyOpen={billing === "1"} />} />
    <div className="mb-8 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <section aria-label="Current subscription" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex items-start gap-4 p-5 sm:p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-goldink"><Crown className="h-6 w-6" aria-hidden /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="subscription-plan-name">{ent.activePaid ? `Paid · ${name}` : name}</h2><AdminStatusPill status={paidCurrent ? paidCurrent.status : "Free"} tone={ent.activePaid ? "success" : "neutral"} /></div><p className="mt-1 text-xs leading-relaxed text-ink2">{paidCurrent ? `Started ${date(paidCurrent.startsAt)} · ${current?.cancelAtPeriodEnd ? "Ends" : "Renew by"} ${date(paidCurrent.endsAt)}` : "No subscription fee. Keep your services listed and accept bookings on NaijaSpa."}</p></div></div>
        <dl className="grid grid-cols-2 divide-x divide-line border-y border-line sm:grid-cols-4">{[
          ["Commission", `${ent.commissionBps / 100}%`], ["Public contact", ent.publicDirectContact ? "Visible" : "Private"],
          ["Visibility", ent.enhancedVisibility ? "Enhanced" : "Standard"], ["Sponsored", ent.sponsoredEligible ? "Eligible" : "Not included"]
        ].map(([label, value]) => <div key={label} className="px-5 py-4"><dt className="text-[11px] text-ink2">{label}</dt><dd className="mt-1 text-xs font-semibold">{value}</dd></div>)}</dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-5 py-4"><p className="flex items-center gap-2 text-xs text-ink2"><RefreshCw className="h-3.5 w-3.5" aria-hidden />{ent.activePaid ? "Manual renewal" : "No recurring listing fee"}</p><Link href="/vendor/support" className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-elev">{ent.activePaid ? "Manage renewal" : "Plan support"}</Link></div>
      </section>
      <section aria-label="Commission savings" className="rounded-xl border border-line bg-card p-5 sm:p-6"><h2 className="font-semibold">Saved this month</h2><p className="mt-2 text-xs leading-relaxed text-ink2">Based on {now.toLocaleDateString("en-NG", { month: "long", timeZone: "Africa/Lagos" })}’s {savings.count} completed bookings ({formatNgn(savings.revenueKobo)} service revenue).</p><p className="subscription-savings mt-4 text-goldink">{formatNgn(savings.savedKobo)}</p><p className="mt-1 text-xs text-ink2">Estimated commission saved against today’s {config.freeCommissionBps / 100}% Free rate.</p>{fee > 0 ? <><div role="progressbar" aria-label="Listing fee covered by commission savings" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-5 h-2 overflow-hidden rounded-full bg-elev"><div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[11px] text-ink2">{progress}% of your {formatNgn(fee)} {name} plan fee covered by these savings.</p></> : <p className="mt-5 border-t border-line pt-3 text-[11px] text-ink2">Compare paid plans below to see their commission rates and benefits.</p>}</section>
    </div>
    {showRenewal && paidCurrent && daysLeft != null ? <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-goldink" /><p className="text-xs leading-relaxed">{daysLeft < 0 ? "Your listing is in its grace period." : daysLeft === 0 ? "Your listing plan ends today." : `Your listing plan ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`} Renew to keep your paid benefits; otherwise your listing returns to Free. <Link href="/vendor/support" className="font-semibold text-goldink underline underline-offset-2">Get renewal help</Link></p></div> : null}
    <SubscriptionPlans plans={plans} current={{ code: ent.planCode, priceKobo: currentPlan?.priceKobo ?? 0 }} canPay={canPay} />
    {!canPay ? <p className="mt-4 text-xs text-ink2">Staff can compare plans and view billing history. Only the business owner can subscribe or switch plans.</p> : null}
  </div>;
}
