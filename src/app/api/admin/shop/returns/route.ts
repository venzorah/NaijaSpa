import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { shopCommissionKobo } from "@/lib/shop/quote";
import { notifyShopUser } from "@/lib/shop/notify";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    const returns = await prisma.shopReturn.findMany({
      include: { vendorOrder: true, master: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return NextResponse.json({ returns });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(["shop.manage", "finance.manage"]);
    const body = z.object({ id: z.string(), status: z.enum(["approved", "rejected", "refunded"]), refundKobo: z.number().int().min(0).optional() }).parse(await req.json());
    const row = await prisma.shopReturn.findUnique({ where: { id: body.id }, include: { vendorOrder: true } });
    if (!row) return NextResponse.json({ error: "Return not found" }, { status: 404 });
    const refundKobo = Math.min(body.refundKobo ?? row.vendorOrder.productKobo, row.vendorOrder.productKobo);
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.shopReturn.update({ where: { id: row.id }, data: { status: body.status, refundKobo: body.status === "rejected" ? 0 : refundKobo } });
      if (body.status === "refunded" && refundKobo > 0) {
        const commission = shopCommissionKobo(refundKobo, row.vendorOrder.commissionBps);
        await tx.shopLedgerEntry.create({
          data: { vendorId: row.vendorOrder.vendorId, vendorOrderId: row.vendorOrderId, kind: "refund", amountKobo: -(refundKobo - commission + 0), note: "Customer refund (product)" }
        });
        await tx.shopLedgerEntry.create({
          data: { vendorId: row.vendorOrder.vendorId, vendorOrderId: row.vendorOrderId, kind: "commission_reversal", amountKobo: commission, note: "Commission reversed on refund" }
        });
        await tx.shopSettlement.updateMany({
          where: { vendorOrderId: row.vendorOrderId, status: { in: ["held", "pending", "available"] } },
          data: { amountKobo: { decrement: refundKobo - commission } }
        });
      }
      return next;
    });
    await notifyShopUser(row.userId, "Return update", `Your return is ${body.status}.`, `/orders/${row.masterOrderId}`);
    return NextResponse.json({ return: updated });
  } catch (e) {
    return jsonError(e);
  }
}
