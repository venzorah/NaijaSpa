import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma, setConfig } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/rbac";
import { durationDaysFromBilling, type VendorPlanBilling } from "@/lib/vendor-plans";
import { ensureLiveVendorPlans, loadVendorPlanFeaturesMap, saveVendorPlanFeatures } from "@/lib/vendor-plans-live";

const billingSchema = z.enum(["none", "weekly", "monthly", "yearly"]);
const featuresSchema = z.array(z.string().trim().min(1).max(160)).max(16).optional();
const commissionBpsSchema = z.coerce.number().min(0).max(10000).optional();
const commissionPercentSchema = z.coerce.number().min(0).max(100).optional();

function resolveCommissionBps(body: { commissionBps?: number; commissionPercent?: number }) {
  if (body.commissionPercent != null && Number.isFinite(body.commissionPercent)) {
    return Math.round(body.commissionPercent * 100);
  }
  if (body.commissionBps != null && Number.isFinite(body.commissionBps)) {
    return Math.max(0, Math.min(10_000, Math.round(body.commissionBps)));
  }
  return undefined;
}

function durationFromBody(body: { billing?: VendorPlanBilling; durationDays?: number; priceKobo?: number; code?: string }) {
  if (body.code === "FREE" || body.billing === "none" || body.priceKobo === 0) return 36500;
  if (body.durationDays && body.durationDays > 0) return body.durationDays;
  if (body.billing) return durationDaysFromBilling(body.billing);
  return 30;
}

export async function GET() {
  try {
    const actor = await requireAdmin(["commercial.manage", "memberships.manage", "finance.view", "vendors.manage"]);
    await ensureLiveVendorPlans();
    const [plans, counts] = await Promise.all([
      prisma.subscriptionPlan.findMany({ orderBy: { priceKobo: "asc" } }),
      prisma.vendorSubscription.groupBy({
        by: ["planId"],
        where: { status: { in: ["active", "grace"] } },
        _count: { _all: true }
      })
    ]);
    const subscriberCount = Object.fromEntries(counts.map((c) => [c.planId, c._count._all]));
    const featureMap = await loadVendorPlanFeaturesMap();
    return NextResponse.json({
      canEdit: hasPermission(actor, "commercial.manage") || hasPermission(actor, "memberships.manage"),
      plans: plans.map((p) => ({
        ...p,
        subscriberCount: subscriberCount[p.id] ?? 0,
        features: featureMap[p.code] || []
      }))
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(["commercial.manage", "memberships.manage"]);
    const body = z
      .object({
        name: z.string().min(2).max(80),
        code: z
          .string()
          .max(40)
          .regex(/^[A-Za-z0-9_]*$/, "Letters, numbers and underscores only")
          .optional(),
        billing: billingSchema.optional(),
        durationDays: z.number().int().positive().optional(),
        priceKobo: z.coerce.number().int().nonnegative(),
        commissionBps: commissionBpsSchema,
        commissionPercent: commissionPercentSchema,
        publicDirectContact: z.boolean().optional(),
        enhancedVisibility: z.boolean().optional(),
        sponsoredEligible: z.boolean().optional(),
        features: featuresSchema
      })
      .parse(await req.json());
    const code = (body.code?.trim() || body.name.replace(/[^A-Za-z0-9]+/g, "_")).toUpperCase();
    const exists = await prisma.subscriptionPlan.findUnique({ where: { code } });
    if (exists) return NextResponse.json({ error: "A listing plan with that code already exists." }, { status: 409 });
    const paid = body.priceKobo > 0 && code !== "FREE";
    const commissionBps = resolveCommissionBps(body) ?? (paid ? 0 : 1000);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        code,
        name: body.name.trim(),
        durationDays: durationFromBody({ ...body, code }),
        priceKobo: code === "FREE" ? 0 : body.priceKobo,
        commissionBps,
        publicDirectContact: paid ? (body.publicDirectContact ?? true) : false,
        enhancedVisibility: body.enhancedVisibility ?? paid,
        sponsoredEligible: body.sponsoredEligible ?? paid,
        unlimitedListings: true,
        active: true
      }
    });
    if (body.features != null) await saveVendorPlanFeatures(code, body.features);
    if (code === "FREE") await setConfig("freeCommissionBps", String(commissionBps));
    revalidateTag("system-config");
    await audit({ actorId: actor.id, action: "vendor_plan.create", entityType: "SubscriptionPlan", entityId: plan.id, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin(["commercial.manage", "memberships.manage"]);
    const body = z
      .object({
        id: z.string(),
        name: z.string().min(2).max(80).optional(),
        billing: billingSchema.optional(),
        durationDays: z.number().int().positive().optional(),
        priceKobo: z.coerce.number().int().nonnegative().optional(),
        commissionBps: commissionBpsSchema,
        commissionPercent: commissionPercentSchema,
        publicDirectContact: z.boolean().optional(),
        enhancedVisibility: z.boolean().optional(),
        sponsoredEligible: z.boolean().optional(),
        active: z.boolean().optional(),
        features: featuresSchema
      })
      .parse(await req.json());
    const before = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: body.id } });
    const nextPrice = before.code === "FREE" ? 0 : body.priceKobo;
    const durationDays =
      body.billing || body.durationDays
        ? durationFromBody({
            billing: body.billing,
            durationDays: body.durationDays,
            priceKobo: nextPrice ?? before.priceKobo,
            code: before.code
          })
        : undefined;
    if (before.code === "FREE" && body.active === false) {
      return NextResponse.json({ error: "Free listing cannot be paused." }, { status: 400 });
    }
    const commissionBps = resolveCommissionBps(body);
    const plan = await prisma.subscriptionPlan.update({
      where: { id: body.id },
      data: {
        name: body.name?.trim(),
        durationDays,
        priceKobo: nextPrice,
        commissionBps,
        publicDirectContact: before.code === "FREE" || nextPrice === 0 ? false : body.publicDirectContact,
        enhancedVisibility: body.enhancedVisibility,
        sponsoredEligible: body.sponsoredEligible,
        active: body.active,
        unlimitedListings: true
      }
    });
    if (body.features != null) await saveVendorPlanFeatures(plan.code, body.features);
    if (before.code === "FREE" && commissionBps != null) {
      await setConfig("freeCommissionBps", String(commissionBps));
    }
    revalidateTag("system-config");
    await audit({ actorId: actor.id, action: "vendor_plan.update", entityType: "SubscriptionPlan", entityId: body.id, before, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}
