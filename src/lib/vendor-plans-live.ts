import { prisma } from "@/lib/db";
import { LEGACY_VENDOR_PLAN_CODES, LIVE_VENDOR_PLANS } from "@/lib/vendor-plans";

export async function ensureLiveVendorPlans() {
  for (const [legacy, next] of Object.entries(LEGACY_VENDOR_PLAN_CODES)) {
    const old = await prisma.subscriptionPlan.findUnique({ where: { code: legacy } });
    const already = await prisma.subscriptionPlan.findUnique({ where: { code: next } });
    if (old && !already) {
      const def = LIVE_VENDOR_PLANS.find((p) => p.code === next);
      if (!def) continue;
      await prisma.subscriptionPlan.update({
        where: { code: legacy },
        data: {
          code: next,
          name: def.name,
          durationDays: def.durationDays,
          priceKobo: old.priceKobo > 0 ? old.priceKobo : def.priceKobo,
          active: true
        }
      });
    } else if (old && already && old.id !== already.id) {
      await prisma.subscriptionPlan.update({ where: { id: old.id }, data: { active: false } });
    }
  }

  for (const plan of LIVE_VENDOR_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code: plan.code } });
    if (existing) {
      if (plan.code === "FREE" && existing.priceKobo !== 0) {
        await prisma.subscriptionPlan.update({ where: { code: "FREE" }, data: { priceKobo: 0 } });
      }
      continue;
    }
    await prisma.subscriptionPlan.create({
      data: {
        code: plan.code,
        name: plan.name,
        durationDays: plan.durationDays,
        priceKobo: plan.priceKobo,
        commissionBps: plan.commissionBps,
        publicDirectContact: plan.publicDirectContact,
        enhancedVisibility: plan.enhancedVisibility,
        sponsoredEligible: plan.sponsoredEligible,
        unlimitedListings: true,
        active: true
      }
    });
  }
}
