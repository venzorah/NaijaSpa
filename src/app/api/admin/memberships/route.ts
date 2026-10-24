import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin(["campaigns.manage", "finance.view"]);
    const [plans, promos] = await Promise.all([
      prisma.membershipPlan.findMany({ orderBy: { priceKobo: "asc" } }),
      prisma.promotion.findMany({ orderBy: { code: "asc" } })
    ]);
    return NextResponse.json({ plans, promos });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("campaigns.manage");
    const body = z
      .object({
        id: z.string(),
        priceKobo: z.number().int().nonnegative().optional(),
        active: z.boolean().optional(),
        benefits: z.string().optional(),
        name: z.string().optional()
      })
      .parse(await req.json());
    const before = await prisma.membershipPlan.findUniqueOrThrow({ where: { id: body.id } });
    const plan = await prisma.membershipPlan.update({
      where: { id: body.id },
      data: { priceKobo: body.priceKobo, active: body.active, benefits: body.benefits, name: body.name }
    });
    await audit({ actorId: actor.id, action: "membership.update", entityType: "MembershipPlan", entityId: body.id, before, after: plan });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}
