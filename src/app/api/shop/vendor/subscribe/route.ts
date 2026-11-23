import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import { grantShopPlan } from "@/lib/shop/plans";
import { SHOP_PLAN_FREE, SHOP_PLAN_MONTHLY } from "@/lib/shop/constants";
import { initPayment } from "@/lib/payments";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireVendor();
    await ensureShopCatalog();
    const plans = await prisma.shopPlan.findMany({ where: { active: true }, orderBy: { priceKobo: "asc" } });
    return NextResponse.json({ plans });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const session = await getSession();
    const body = z.object({ planCode: z.enum([SHOP_PLAN_FREE, SHOP_PLAN_MONTHLY]) }).parse(await req.json());
    if (body.planCode === SHOP_PLAN_FREE) {
      await grantShopPlan(user.vendorId, SHOP_PLAN_FREE, "self");
      return NextResponse.json({ ok: true });
    }
    const plan = await prisma.shopPlan.findUnique({ where: { code: body.planCode } });
    if (!plan || plan.priceKobo < 100) return NextResponse.json({ error: "Plan is not billable." }, { status: 400 });
    const pay = await initPayment({
      email: session?.email || "vendor@naijaspa.com",
      amountKobo: plan.priceKobo,
      purpose: "shop_subscription",
      callbackPath: "/vendor/shop/plan",
      metadata: { vendorId: user.vendorId, planCode: plan.code }
    });
    return NextResponse.json({ pay });
  } catch (e) {
    return jsonError(e);
  }
}
