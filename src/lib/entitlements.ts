import { prisma } from "./db";
import { entitlementFromPlan, FREE_ENTITLEMENT, type Entitlement } from "./commercial";

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
