import { prisma } from "@/lib/db";
import { ShopPlanEditor } from "@/components/admin/shop-plan-editor";
import { ensureShopCatalog } from "@/lib/shop/ensure";

export default async function EcommercePlansPage() {
  await ensureShopCatalog();
  const plans = await prisma.shopPlan.findMany({ orderBy: { priceKobo: "asc" } });
  return (
    <div>
      <h1 className="font-display text-3xl">Shop subscriptions</h1>
      <p className="mt-2 text-sm text-ink2">Separate from service listing plans (Free, Silver, Gold, Platinum).</p>
      <div className="mt-6 space-y-4">
        {plans.map((p) => (
          <ShopPlanEditor key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}
