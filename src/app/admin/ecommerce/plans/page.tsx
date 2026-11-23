import { prisma } from "@/lib/db";
import { ShopPlanEditor } from "@/components/admin/shop-plan-editor";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommercePlansPage() {
  await ensureShopCatalog();
  const plans = await shopQuery(() => prisma.shopPlan.findMany({ orderBy: { priceKobo: "asc" } }), []);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Money</p>
      <h1 className="mt-1 font-display text-3xl">Shop subscriptions</h1>
      <p className="mt-2 text-sm text-ink2">Separate from service listing plans (Free, Silver, Gold, Platinum).</p>
      <div className="mt-6 space-y-4">
        {plans.map((p) => (
          <ShopPlanEditor key={p.id} plan={p} />
        ))}
        {!plans.length ? <p className="text-sm text-ink2">Plans appear when the Shop database is reachable. Seed will not overwrite admin prices.</p> : null}
      </div>
    </div>
  );
}
