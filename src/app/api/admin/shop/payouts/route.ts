import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { shopMinPayoutKobo } from "@/lib/shop/ensure";
import { notifyShopUser } from "@/lib/shop/notify";

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
    const min = await shopMinPayoutKobo();
    const due = await prisma.shopSettlement.findMany({
      where: { vendorId: body.vendorId, status: { in: ["available", "held"] }, availableAt: { lte: new Date() }, payoutId: null }
    });
    const amount = due.reduce((s, row) => s + row.amountKobo, 0);
    if (amount < min) return NextResponse.json({ error: "Below the minimum payout." }, { status: 400 });
    const reference = `NS-SHOP-PAY-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.shopPayout.create({
        data: { vendorId: body.vendorId, amountKobo: amount, status: "paid", reference }
      });
      await tx.shopSettlement.updateMany({
        where: { id: { in: due.map((row) => row.id) } },
        data: { status: "paid", paidAt: new Date(), payoutId: created.id }
      });
      await tx.shopLedgerEntry.create({
        data: { vendorId: body.vendorId, kind: "payout", amountKobo: -amount, note: created.reference }
      });
      return created;
    });
    const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
    if (vendor) await notifyShopUser(vendor.ownerId, "Shop payout sent", `Payout ${payout.reference} is recorded.`, "/vendor/shop/payouts");
    return NextResponse.json({ payout });
  } catch (e) {
    return jsonError(e);
  }
}
