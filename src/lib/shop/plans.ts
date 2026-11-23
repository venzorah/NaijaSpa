import { prisma } from "@/lib/db";
import { SHOP_PLAN_FREE } from "./constants";
import { ensureShopCatalog } from "./ensure";

export async function activeShopEntitlement(vendorId: string) {
  await ensureShopCatalog();
  const now = new Date();
  const sub = await prisma.shopVendorSubscription.findFirst({
    where: { vendorId, status: "active", endsAt: { gt: now } },
    include: { plan: true },
    orderBy: { endsAt: "desc" }
  });
  if (sub?.plan) {
    return { planCode: sub.plan.code, commissionBps: sub.plan.commissionBps, featuredBoost: sub.plan.featuredBoost };
  }
  const free = await prisma.shopPlan.findUnique({ where: { code: SHOP_PLAN_FREE } });
  return {
    planCode: free?.code ?? SHOP_PLAN_FREE,
    commissionBps: free?.commissionBps ?? 1000,
    featuredBoost: false
  };
}

export async function grantShopPlan(vendorId: string, planCode: string, source = "admin") {
  const plan = await prisma.shopPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) throw Object.assign(new Error("Unknown shop plan"), { status: 400 });
  const at = new Date();
  await prisma.shopVendorSubscription.updateMany({
    where: { vendorId, status: "active" },
    data: { status: "expired" }
  });
  const endsAt =
    plan.priceKobo <= 0 || plan.durationDays >= 3650
      ? new Date("9999-12-31")
      : new Date(at.getTime() + plan.durationDays * 86_400_000);
  return prisma.shopVendorSubscription.create({
    data: { vendorId, planId: plan.id, status: "active", source, startsAt: at, endsAt }
  });
}
