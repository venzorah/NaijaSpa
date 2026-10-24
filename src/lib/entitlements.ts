import { prisma } from "./db";
import { entitlementFromPlan, FREE_ENTITLEMENT, type Entitlement } from "./commercial";

export async function vendorEntitlements(vendorIds: string[], at = new Date()): Promise<Map<string, Entitlement>> {
  const unique = Array.from(new Set(vendorIds.filter(Boolean)));
  const map = new Map<string, Entitlement>();
  for (const id of unique) map.set(id, FREE_ENTITLEMENT);
  if (!unique.length) return map;

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
    map.set(vendorId, entitlementFromPlan(sub.plan, at, sub));
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
  const ent = entitlementFromPlan(sub.plan, at, sub);
  if (!ent.activePaid && sub.plan.code !== "FREE") {
    await prisma.vendorSubscription.update({
      where: { id: sub.id },
      data: { status: "expired" }
    });
    const free = await prisma.subscriptionPlan.findUnique({ where: { code: "FREE" } });
    if (free) {
      await prisma.vendorSubscription.create({
        data: {
          vendorId,
          planId: free.id,
          status: "active",
          source: "expiry",
          startsAt: at,
          endsAt: new Date("9999-12-31")
        }
      });
    }
    return FREE_ENTITLEMENT;
  }
  return ent;
}
