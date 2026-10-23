import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { getCommercialConfig, setConfig, prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "finance.view");
    const config = await getCommercialConfig();
    const plans = await prisma.subscriptionPlan.findMany();
    return NextResponse.json({ config, plans });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "commercial.manage");
    const before = await getCommercialConfig();
    const body = z
      .object({
        spaSurchargeKobo: z.number().int().nonnegative().optional(),
        hotelSurchargeKobo: z.number().int().nonnegative().optional(),
        homeSurchargeKobo: z.number().int().nonnegative().optional(),
        surchargeRecipient: z.enum(["vendor", "platform", "split"]).optional(),
        freeCommissionBps: z.number().int().min(0).max(10000).optional(),
        paidCommissionBps: z.number().int().min(0).max(10000).optional(),
        graceDays: z.number().int().min(0).optional(),
        plans: z
          .array(z.object({ code: z.string(), priceKobo: z.number().int().nonnegative() }))
          .optional()
      })
      .parse(await req.json());
    for (const key of ["spaSurchargeKobo", "hotelSurchargeKobo", "homeSurchargeKobo", "surchargeRecipient", "freeCommissionBps", "paidCommissionBps", "graceDays"] as const) {
      if (body[key] != null) await setConfig(key, String(body[key]));
    }
    if (body.plans) {
      for (const p of body.plans) {
        if (p.code === "FREE" && p.priceKobo !== 0) continue;
        await prisma.subscriptionPlan.update({ where: { code: p.code }, data: { priceKobo: p.priceKobo } });
      }
    }
    const after = await getCommercialConfig();
    await audit({ actorId: user.id, action: "commercial.update", entityType: "SystemConfig", entityId: "commercial", before, after });
    return NextResponse.json({ config: after });
  } catch (e) {
    return jsonError(e);
  }
}
