import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/rbac";
import { MEMBERSHIP_INTERVALS, planCodeFromName, serializeBenefits } from "@/lib/membership";
import { ensureLiveMembershipPlans } from "@/lib/membership-live";

const intervalSchema = z.enum(MEMBERSHIP_INTERVALS);

export async function GET() {
  try {
    const actor = await requireAdmin(["memberships.manage", "campaigns.manage", "finance.view"]);
    await ensureLiveMembershipPlans();
    const [plans, promos, counts] = await Promise.all([
      prisma.membershipPlan.findMany({ orderBy: { priceKobo: "asc" } }),
      prisma.promotion.findMany({ orderBy: { code: "asc" } }),
      prisma.customerMembership.groupBy({
        by: ["planId"],
        where: { status: "active" },
        _count: { _all: true }
      })
    ]);
    const memberCount = Object.fromEntries(counts.map((c) => [c.planId, c._count._all]));
    return NextResponse.json({
      canEdit: hasPermission(actor.role, "memberships.manage"),
      plans: plans.map((p) => ({ ...p, memberCount: memberCount[p.id] ?? 0 })),
      promos
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("memberships.manage");
    const body = z
      .object({
        name: z.string().min(2).max(80),
        code: z
          .string()
          .max(40)
          .regex(/^[A-Za-z0-9_]*$/, "Letters, numbers and underscores only")
          .optional(),
        interval: intervalSchema,
        priceKobo: z.number().int().nonnegative(),
        benefits: z.union([z.string(), z.array(z.string())])
      })
      .parse(await req.json());
    const code = (body.code?.trim() || planCodeFromName(body.name, body.interval)).toUpperCase();
    const exists = await prisma.membershipPlan.findUnique({ where: { code } });
    if (exists) return NextResponse.json({ error: "A plan with that code already exists." }, { status: 409 });
    const benefits = serializeBenefits(Array.isArray(body.benefits) ? body.benefits : parseLines(body.benefits));
    const priceKobo = body.interval === "none" ? 0 : body.priceKobo;
    const plan = await prisma.membershipPlan.create({
      data: {
        code,
        name: body.name.trim(),
        interval: body.interval,
        priceKobo,
        benefits,
        active: true
      }
    });
    await audit({ actorId: actor.id, action: "membership.create", entityType: "MembershipPlan", entityId: plan.id, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("memberships.manage");
    const body = z
      .object({
        id: z.string(),
        priceKobo: z.number().int().nonnegative().optional(),
        active: z.boolean().optional(),
        benefits: z.union([z.string(), z.array(z.string())]).optional(),
        name: z.string().min(2).max(80).optional(),
        interval: intervalSchema.optional()
      })
      .parse(await req.json());
    const before = await prisma.membershipPlan.findUniqueOrThrow({ where: { id: body.id } });
    const benefits =
      body.benefits == null
        ? undefined
        : serializeBenefits(Array.isArray(body.benefits) ? body.benefits : parseLines(body.benefits));
    const interval = body.interval;
    const priceKobo = interval === "none" ? 0 : body.priceKobo;
    const plan = await prisma.membershipPlan.update({
      where: { id: body.id },
      data: {
        priceKobo,
        active: body.active,
        benefits,
        name: body.name?.trim(),
        interval
      }
    });
    await audit({ actorId: actor.id, action: "membership.update", entityType: "MembershipPlan", entityId: body.id, before, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}

function parseLines(raw: string) {
  return raw
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
