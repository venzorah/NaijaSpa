import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { formatNgn } from "@/lib/money";

export default async function Page() {
  const user = await getSession();
  const plans = await prisma.subscriptionPlan.findMany();
  const ent = user?.vendorId ? await vendorEntitlement(user.vendorId) : null;
  return (
    <div>
      <h1 className="font-display text-3xl">Subscriptions</h1>
      <p className="text-sm text-ink2">Current entitlement: {ent?.planCode}. Paid prices are set by NaijaSpa admin. ₦0 means the plan is not for sale yet (admin grant still works).</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm">{formatNgn(p.priceKobo)} · {p.commissionBps / 100}% commission</p>
            <p className="text-xs text-ink2">Unlimited listings · contact {p.publicDirectContact ? "yes" : "no"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
