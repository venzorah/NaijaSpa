import { getCommercialConfig, prisma } from "./db";
import { entitlementFromPlan, FREE_ENTITLEMENT, type Entitlement } from "./commercial";
import { lapsePaidSubscriptionToFree } from "./subscription-lifecycle";

export async function vendorEntitlements(vendorIds: string[], at = new Date()): Promise<Map<string, Entitlement>> {
  const unique = Array.from(new Set(vendorIds.filter(Boolean)));
  const map = new Map<string, Entitlement>();
  for (const id of unique) map.set(id, FREE_ENTITLEMENT);
  if (!unique.length) return map;
  const config = await getCommercialConfig();

  const subs = await prisma.vendorSubscription.findMany({
    where: { vendorId: { in: unique }, status: { in: ["active", "grace"] } },
    include: { plan: true }
  });
  const latest = new Map<string, (typeof subs)[number]>();
  for (const sub of subs) {
    const prev = latest.get(sub.vendorId);
    if (!prev || sub.endsAt > prev.endsAt) latest.set(sub.vendorId, sub);
  }
  for (const [vendorId, sub] of latest) {
    map.set(vendorId, entitlementFromPlan(sub.plan, at, sub, config.graceDays));
  }
  return map;
}

export async function vendorEntitlement(vendorId: string, at = new Date()): Promise<Entitlement> {
  const sub = await prisma.vendorSubscription.findFirst({
    where: { vendorId, status: { in: ["active", "grace"] } },
    include: { plan: true },
    orderBy: { endsAt: "desc" }
  });
  if (!sub) return FREE_ENTITLEMENT;
  const config = await getCommercialConfig();
  const ent = entitlementFromPlan(sub.plan, at, sub, config.graceDays);
  if (!ent.activePaid && sub.plan.code !== "FREE") {
    await lapsePaidSubscriptionToFree(vendorId, sub.id, at);
    return FREE_ENTITLEMENT;
  }
  return ent;
}
