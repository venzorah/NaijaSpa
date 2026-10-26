import { prisma } from "@/lib/db";
import { LIVE_MEMBERSHIP_PLANS, serializeBenefits } from "@/lib/membership";

export async function ensureLiveMembershipPlans() {
  for (const plan of LIVE_MEMBERSHIP_PLANS) {
    const existing = await prisma.membershipPlan.findUnique({ where: { code: plan.code } });
    if (existing) {
      if (plan.code === "FREE" && existing.priceKobo !== 0) {
        await prisma.membershipPlan.update({ where: { code: "FREE" }, data: { priceKobo: 0, interval: "none" } });
      }
      continue;
    }
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
