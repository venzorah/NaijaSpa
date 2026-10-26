import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { initPayment } from "@/lib/payments";
import { ROLES } from "@/lib/rbac";
import { ensureLiveVendorPlans } from "@/lib/vendor-plans-live";

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    if (user.role !== ROLES.VENDOR_OWNER) {
      return NextResponse.json({ error: "Only the spa owner can subscribe or upgrade." }, { status: 403 });
    }
    const { planCode } = z.object({ planCode: z.string().min(1) }).parse(await req.json());
    await ensureLiveVendorPlans();
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan || !plan.active) return NextResponse.json({ error: "That listing plan is not available." }, { status: 404 });
    if (plan.priceKobo <= 0 || plan.code === "FREE") {
      return NextResponse.json({ error: "Free is the default listing plan. Choose Silver, Gold or Platinum to subscribe." }, { status: 400 });
    }
    const result = await initPayment({
      email: user.email,
      amountKobo: plan.priceKobo,
      purpose: "subscription",
      callbackPath: "/vendor/subscriptions/verify",
      metadata: {
        vendorId: user.vendorId,
        planCode: plan.code,
        ownerId: user.id
      }
    });
    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      publicKey: result.publicKey,
      reference: result.payment.reference,
      amountKobo: result.payment.amountKobo,
      blocked: result.blocked,
      message: result.message
    });
  } catch (e) {
    return jsonError(e);
  }
}
