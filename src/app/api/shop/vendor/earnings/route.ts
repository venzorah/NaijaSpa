import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { activeShopEntitlement } from "@/lib/shop/plans";

export async function GET() {
  try {
    const user = await requireVendor();
    const [ledger, settlements, payouts, entitlement] = await Promise.all([
      prisma.shopLedgerEntry.findMany({ where: { vendorId: user.vendorId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.shopSettlement.findMany({ where: { vendorId: user.vendorId }, orderBy: { createdAt: "desc" } }),
      prisma.shopPayout.findMany({ where: { vendorId: user.vendorId }, orderBy: { createdAt: "desc" } }),
      activeShopEntitlement(user.vendorId)
    ]);
    const available = settlements.filter((s) => s.status !== "paid" && s.availableAt <= new Date()).reduce((n, s) => n + s.amountKobo, 0);
    const pending = settlements.filter((s) => s.status !== "paid" && s.availableAt > new Date()).reduce((n, s) => n + s.amountKobo, 0);
    return NextResponse.json({ ledger, settlements, payouts, entitlement, available, pending });
  } catch (e) {
    return jsonError(e);
  }
}
