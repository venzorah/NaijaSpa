import { prisma, setConfig } from "@/lib/db";
import { duringNextBuild } from "@/lib/live-db";
import {
  canonicalVendorPlanCode,
  defaultVendorListingPlans,
  LEGACY_VENDOR_PLAN_CODES,
  LIVE_VENDOR_PLANS,
  parsePlanFeatures,
  parseVendorPlanFeaturesMap,
  VENDOR_PLAN_FEATURES_KEY,
  type VendorListingPlanView
} from "@/lib/vendor-plans";

export async function ensureLiveVendorPlans() {
  if (duringNextBuild() || !process.env.DATABASE_URL) return;
  try {
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
      if (plan.code === "FREE" && (existing.priceKobo !== 0 || existing.publicDirectContact)) {
        await prisma.subscriptionPlan.update({
          where: { code: "FREE" },
          data: { priceKobo: 0, publicDirectContact: false }
        });
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
  } catch {
    return;
  }
}

export async function resolveVendorListingPlan(code: string) {
  await ensureLiveVendorPlans();
  const canonical = canonicalVendorPlanCode(code);
  return prisma.subscriptionPlan.findFirst({
    where: { OR: [{ code: canonical }, { code: code.trim() }] }
  });
}

export async function listAdminGrantableVendorPlans() {
  await ensureLiveVendorPlans();
  const rows = await prisma.subscriptionPlan.findMany({ orderBy: { priceKobo: "asc" } });
  return rows.filter((p) => !LEGACY_VENDOR_PLAN_CODES[p.code]);
}

export async function loadVendorPlanFeaturesMap(): Promise<Record<string, string[]>> {
  const row = await prisma.systemConfig.findUnique({ where: { key: VENDOR_PLAN_FEATURES_KEY } }).catch(() => null);
  return parseVendorPlanFeaturesMap(row?.value);
}

export async function saveVendorPlanFeatures(code: string, features: string[]) {
  const current = await loadVendorPlanFeaturesMap();
  current[code] = parsePlanFeatures(features);
  await setConfig(VENDOR_PLAN_FEATURES_KEY, JSON.stringify(
    Object.fromEntries(Object.entries(current).map(([key, lines]) => [key, lines]))
  ));
}

export async function listPublicVendorPlans(): Promise<VendorListingPlanView[]> {
  if (duringNextBuild() || !process.env.DATABASE_URL) return defaultVendorListingPlans();
  await ensureLiveVendorPlans();
  const [rows, featureMap] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceKobo: "asc" }
    }),
    loadVendorPlanFeaturesMap()
  ]);
  return rows.map((p) => ({
    code: p.code,
    name: p.name,
    priceKobo: p.priceKobo,
    durationDays: p.durationDays,
    commissionBps: p.commissionBps,
    publicDirectContact: p.publicDirectContact,
    enhancedVisibility: p.enhancedVisibility,
    sponsoredEligible: p.sponsoredEligible,
    features: featureMap[p.code] || []
  }));
}
