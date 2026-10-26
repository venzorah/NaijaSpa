import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/rbac";
import { durationDaysFromBilling, type VendorPlanBilling } from "@/lib/vendor-plans";
import { ensureLiveVendorPlans } from "@/lib/vendor-plans-live";

const billingSchema = z.enum(["none", "weekly", "monthly", "yearly"]);

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
    return NextResponse.json({
      canEdit: hasPermission(actor.role, "commercial.manage") || hasPermission(actor.role, "memberships.manage"),
      plans: plans.map((p) => ({ ...p, subscriberCount: subscriberCount[p.id] ?? 0 }))
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
        priceKobo: z.number().int().nonnegative(),
        commissionBps: z.number().int().min(0).max(10000).optional(),
        publicDirectContact: z.boolean().optional(),
        enhancedVisibility: z.boolean().optional(),
        sponsoredEligible: z.boolean().optional()
      })
      .parse(await req.json());
    const code = (body.code?.trim() || body.name.replace(/[^A-Za-z0-9]+/g, "_")).toUpperCase();
    const exists = await prisma.subscriptionPlan.findUnique({ where: { code } });
    if (exists) return NextResponse.json({ error: "A listing plan with that code already exists." }, { status: 409 });
    const paid = body.priceKobo > 0 && code !== "FREE";
    const plan = await prisma.subscriptionPlan.create({
      data: {
        code,
        name: body.name.trim(),
        durationDays: durationFromBody({ ...body, code }),
        priceKobo: code === "FREE" ? 0 : body.priceKobo,
        commissionBps: body.commissionBps ?? (paid ? 0 : 1000),
        publicDirectContact: paid ? (body.publicDirectContact ?? true) : false,
        enhancedVisibility: body.enhancedVisibility ?? paid,
        sponsoredEligible: body.sponsoredEligible ?? paid,
        unlimitedListings: true,
        active: true
      }
    });
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
        priceKobo: z.number().int().nonnegative().optional(),
        commissionBps: z.number().int().min(0).max(10000).optional(),
        publicDirectContact: z.boolean().optional(),
        enhancedVisibility: z.boolean().optional(),
        sponsoredEligible: z.boolean().optional(),
        active: z.boolean().optional()
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
    const plan = await prisma.subscriptionPlan.update({
      where: { id: body.id },
      data: {
        name: body.name?.trim(),
        durationDays,
        priceKobo: nextPrice,
        commissionBps: body.commissionBps,
        publicDirectContact: before.code === "FREE" || nextPrice === 0 ? false : body.publicDirectContact,
        enhancedVisibility: body.enhancedVisibility,
        sponsoredEligible: body.sponsoredEligible,
        active: body.active,
        unlimitedListings: true
      }
    });
    await audit({ actorId: actor.id, action: "vendor_plan.update", entityType: "SubscriptionPlan", entityId: body.id, before, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}
