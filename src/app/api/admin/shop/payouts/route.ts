import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { notifyShopUser } from "@/lib/shop/notify";
import { payShopVendorBalance } from "@/lib/shop/payout";

export async function GET() {
  try {
    await requireAdmin(["shop.manage", "finance.view"]);
    const [settlements, payouts] = await Promise.all([
      prisma.shopSettlement.findMany({ include: { vendor: { select: { businessName: true } }, vendorOrder: true }, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.shopPayout.findMany({ include: { vendor: { select: { businessName: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
    ]);
    return NextResponse.json({ settlements, payouts });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin("finance.manage");
    const body = z.object({ vendorId: z.string() }).parse(await req.json());
    const payout = await payShopVendorBalance(body.vendorId);
    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
    if (vendor) {
      await notifyShopUser(
        vendor.ownerId,
        payout.status === "paid" ? "Shop payout sent" : "Shop payout in progress",
        `Payout ${payout.reference} is ${payout.status}.`,
        "/vendor/shop/earnings"
      );
    }
    return NextResponse.json({ payout });
  } catch (e) {
    return jsonError(e);
  }
}
