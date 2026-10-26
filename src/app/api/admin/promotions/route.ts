import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("memberships.manage");
    const body = z
      .object({
        code: z.string().min(3),
        description: z.string().min(2),
        percentOff: z.number().int().min(0).max(100).optional(),
        amountKobo: z.number().int().min(0).optional(),
        startsAt: z.string(),
        endsAt: z.string(),
        maxRedemptions: z.number().int().positive().optional()
      })
      .parse(await req.json());
    const promo = await prisma.promotion.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description,
        percentOff: body.percentOff ?? 0,
        amountKobo: body.amountKobo ?? 0,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        maxRedemptions: body.maxRedemptions
      }
    });
    await audit({ actorId: actor.id, action: "promo.create", entityType: "Promotion", entityId: promo.id, after: promo });
    return NextResponse.json({ promo });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("memberships.manage");
    const body = z.object({ id: z.string(), active: z.boolean() }).parse(await req.json());
    const before = await prisma.promotion.findUniqueOrThrow({ where: { id: body.id } });
    const promo = await prisma.promotion.update({ where: { id: body.id }, data: { active: body.active } });
    await audit({ actorId: actor.id, action: "promo.update", entityType: "Promotion", entityId: body.id, before, after: promo });
    return NextResponse.json({ promo });
  } catch (e) {
    return jsonError(e);
  }
}
