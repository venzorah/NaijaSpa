import { prisma } from "@/lib/db";
import { LIVE_MEMBERSHIP_PLANS, serializeBenefits } from "@/lib/membership";

export async function ensureLiveMembershipPlans() {
  const codes = LIVE_MEMBERSHIP_PLANS.map((p) => p.code);
  const existing = await prisma.membershipPlan.findMany({
    where: { code: { in: [...codes] } },
    select: { code: true }
  });
  const have = new Set(existing.map((p) => p.code));
  for (const plan of LIVE_MEMBERSHIP_PLANS) {
    if (have.has(plan.code)) continue;
    await prisma.membershipPlan.create({
      data: {
        code: plan.code,
        name: plan.name,
        interval: plan.interval,
        priceKobo: plan.priceKobo,
        benefits: serializeBenefits(plan.benefits),
        active: true
      }
    });
  }
}
