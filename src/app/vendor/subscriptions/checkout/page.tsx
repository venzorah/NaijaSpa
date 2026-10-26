import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { vendorPlanBillingLabel, vendorPlanPerks } from "@/lib/vendor-plans";
import { ensureLiveVendorPlans } from "@/lib/vendor-plans-live";
import { vendorEntitlement } from "@/lib/entitlements";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { VendorPlanPaystack } from "@/components/vendor-plan-paystack";
import { ROLES } from "@/lib/rbac";

export default async function VendorPlanCheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getSession();
  if (!user?.vendorId) redirect("/login/vendor?next=/vendor/subscriptions");
  const { plan: planCode } = await searchParams;
  if (!planCode) redirect("/vendor/subscriptions");
  await ensureLiveVendorPlans();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) notFound();
  if (plan.priceKobo <= 0 || plan.code === "FREE") redirect("/vendor/subscriptions");

  const ent = await vendorEntitlement(user.vendorId);
  const already = ent.planCode === plan.code && ent.activePaid;
  const canPay = user.role === ROLES.VENDOR_OWNER;

  return (
    <div className="mx-auto max-w-lg">
      <VendorPageHeader
        title={`Pay for ${plan.name}`}
        description="Paystack collects this listing plan. Your public contact and commission update after the charge is verified."
      />
      <div className="rounded-3xl border border-line bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-goldink">Listing plan</p>
        <h2 className="mt-1 font-display text-3xl font-semibold">{plan.name}</h2>
        <p className="mt-1 text-sm text-ink2">{vendorPlanBillingLabel(plan.durationDays, plan.priceKobo)}</p>
        <p className="mt-4 font-display text-4xl">{formatNgn(plan.priceKobo)}</p>
        <p className="mt-1 text-xs text-ink2">NGN · charged in kobo on Paystack</p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink2">
          {vendorPlanPerks(plan).slice(0, 4).map((perk) => (
            <li key={perk}>✓ {perk}</li>
          ))}
        </ul>
      </div>
      {already ? (
        <p className="mt-6 text-sm text-ink2">This is already your active listing plan.</p>
      ) : !canPay ? (
        <p className="mt-6 text-sm text-ink2">Only the spa owner can pay for a listing plan.</p>
      ) : (
        <VendorPlanPaystack planCode={plan.code} amountLabel={formatNgn(plan.priceKobo)} />
      )}
      <Link href="/vendor/subscriptions" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-leaf">
        Back to listing plans
      </Link>
    </div>
  );
}
