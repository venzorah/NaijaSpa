import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { vendorPlanBillingLabel } from "@/lib/vendor-plans";
import { ensureLiveVendorPlans, listPublicVendorPlans } from "@/lib/vendor-plans-live";
import { calendarDaysUntil, renewalNoticeDays } from "@/lib/subscription-renewal";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { VendorPlanCheckout } from "@/components/vendor-plan-checkout";
import { ROLES } from "@/lib/rbac";
import Link from "next/link";

export default async function Page() {
  const user = await getSession();
  await ensureLiveVendorPlans();
  const plans = await listPublicVendorPlans();
  const ent = user?.vendorId ? await vendorEntitlement(user.vendorId) : null;
  const current = await prisma.vendorSubscription.findFirst({
    where: { vendorId: user?.vendorId || "", status: { in: ["active", "grace"] } },
    include: { plan: true },
    orderBy: { endsAt: "desc" }
  });
  const paidCurrent = current && current.plan.code !== "FREE" && current.endsAt.getUTCFullYear() < 9000 ? current : null;
  const daysLeft = paidCurrent ? calendarDaysUntil(paidCurrent.endsAt) : null;
  const noticeWindows = paidCurrent ? renewalNoticeDays(paidCurrent.plan.durationDays) : [];
  const showRenewal = daysLeft != null && daysLeft <= Math.max(...noticeWindows, 0);
  const currentView = current
    ? { code: current.plan.code, priceKobo: current.plan.priceKobo }
    : ent
      ? { code: ent.planCode, priceKobo: ent.activePaid ? 1 : 0 }
      : { code: "FREE", priceKobo: 0 };
  const canPay = user?.role === ROLES.VENDOR_OWNER;
  return (
    <div>
      <VendorPageHeader
        title="Listing plans"
        description="These packages are for therapists, not customer booking memberships. Start on Free, then subscribe or upgrade when you want public contact and lower commission."
      />
      {showRenewal && paidCurrent && daysLeft != null ? (
        <Panel className="mb-4 border-gold/40" title="Renewal notice">
          <p className="text-sm">
            {paidCurrent.plan.name}{" "}
            {daysLeft < 0
              ? "is in grace. Renew now or this listing returns to Free."
              : daysLeft === 0
                ? "renews today. If you do not renew, this listing returns to Free and booking commission applies."
                : `renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${paidCurrent.endsAt.toLocaleDateString("en-NG")}). If you do not renew, this listing returns to Free.`}
          </p>
          {canPay ? (
            <Link
              href={`/vendor/subscriptions/checkout?plan=${encodeURIComponent(paidCurrent.plan.code)}`}
              className="mt-3 inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold"
            >
              Pay to renew {paidCurrent.plan.name}
            </Link>
          ) : null}
        </Panel>
      ) : null}
      <Panel className="mb-4" title="Current listing plan" actions={<AdminStatusPill status={ent?.activePaid ? "Paid" : "Free"} />}>
        <p className="text-sm">
          {current?.plan.name ?? ent?.planCode ?? "FREE"} · {ent?.commissionBps ? `${ent.commissionBps / 100}% commission` : "0% commission"}
        </p>
        {paidCurrent ? (
          <p className="mt-1 text-xs text-ink2">
            {vendorPlanBillingLabel(paidCurrent.plan.durationDays, paidCurrent.plan.priceKobo)} · {paidCurrent.status} · renews{" "}
            {paidCurrent.endsAt.toLocaleDateString("en-NG")}
            {daysLeft != null ? ` · ${daysLeft < 0 ? "grace" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink2">No listing fee. Commission applies on successful bookings until you subscribe or upgrade.</p>
        )}
      </Panel>
      <h2 className="mb-3 font-display text-xl">{ent?.activePaid ? "Upgrade or switch" : "Subscribe"}</h2>
      <VendorPlanCheckout plans={plans} current={currentView} canPay={Boolean(canPay)} />
      {!canPay ? (
        <p className="mt-3 text-sm text-ink2">
          Staff can view plans. Ask the spa owner to subscribe.{" "}
          <Link href="/vendor/support" className="font-semibold text-leaf">
            Support
          </Link>
        </p>
      ) : null}
    </div>
  );
}
