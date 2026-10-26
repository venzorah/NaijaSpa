import Link from "next/link";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { formatNgn } from "@/lib/money";
import { vendorPlanBillingLabel } from "@/lib/vendor-plans";
import { ensureLiveVendorPlans } from "@/lib/vendor-plans-live";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { cn } from "@/lib/cn";

export default async function Page() {
  const user = await getSession();
  await ensureLiveVendorPlans();
  const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { priceKobo: "asc" } });
  const ent = user?.vendorId ? await vendorEntitlement(user.vendorId) : null;
  const current = await prisma.vendorSubscription.findFirst({
    where: { vendorId: user?.vendorId || "", status: { in: ["active", "grace"] } },
    include: { plan: true },
    orderBy: { endsAt: "desc" }
  });
  return (
    <div>
      <VendorPageHeader
        title="Subscription"
        description="Free listings pay commission on each successful booking. Silver, Gold and Platinum are subscription packages set by NaijaSpa."
      />
      <Panel className="mb-4" title="Current plan" actions={<AdminStatusPill status={ent?.activePaid ? "Paid" : "Free"} />}>
        <p className="text-sm">
          {current?.plan.name ?? ent?.planCode ?? "FREE"} · {ent?.commissionBps ? `${ent.commissionBps / 100}% commission` : "0% commission"}
        </p>
        {current ? (
          <p className="mt-1 text-xs text-ink2">
            {current.status} · ends {current.endsAt.toLocaleDateString("en-NG")}
          </p>
        ) : null}
      </Panel>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const currentCode = ent?.planCode === p.code;
          return (
            <li key={p.id}>
              <Panel className={cn(currentCode && "border-gold/50")} title={p.name} actions={currentCode ? <AdminStatusPill status="Current" /> : null}>
                <p className="font-display text-2xl">{p.priceKobo === 0 ? "₦0" : formatNgn(p.priceKobo)}</p>
                <p className="text-xs text-ink2">{vendorPlanBillingLabel(p.durationDays, p.priceKobo)}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-goldink" aria-hidden />
                    {p.commissionBps / 100}% commission
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-goldink" aria-hidden />
                    Unlimited listings
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-goldink" aria-hidden />
                    Public phone & WhatsApp {p.publicDirectContact ? "included" : "hidden"}
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-goldink" aria-hidden />
                    Sponsored eligible {p.sponsoredEligible ? "yes" : "no"}
                  </li>
                </ul>
                {p.priceKobo === 0 ? (
                  <p className="mt-4 text-xs text-ink2">Default plan. Admin can grant a paid plan.</p>
                ) : (
                  <Link href="/vendor/support" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold">
                    Request this plan
                  </Link>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
