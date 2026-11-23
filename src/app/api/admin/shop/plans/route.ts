import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { clampCommissionBps } from "@/lib/money";
import { SHOP_PLAN_FREE } from "@/lib/shop/constants";

export async function GET() {
  try {
    await requireAdmin(["shop.manage", "commercial.manage"]);
    await ensureShopCatalog();
    const plans = await prisma.shopPlan.findMany({ orderBy: { priceKobo: "asc" } });
    return NextResponse.json({ plans });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z
      .object({
        id: z.string(),
        name: z.string().min(2).max(80),
        priceKobo: z.number().int().min(0).max(50_000_000),
        commissionPercent: z.number().min(0).max(100),
        durationDays: z.number().int().min(1).max(4000),
        featuredBoost: z.boolean(),
        active: z.boolean()
      })
      .parse(await req.json());
    const existing = await prisma.shopPlan.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const plan = await prisma.shopPlan.update({
      where: { id: body.id },
      data: {
        name: body.name,
        priceKobo: existing.code === SHOP_PLAN_FREE ? 0 : body.priceKobo,
        commissionBps: clampCommissionBps(Math.round(body.commissionPercent * 100)),
        durationDays: body.durationDays,
        featuredBoost: body.featuredBoost,
        active: body.active
      }
    });
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError(e);
  }
}
