import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { notifyShopUser } from "@/lib/shop/notify";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const body = z.object({ vendorOrderId: z.string(), reason: z.string().min(4).max(500), evidenceUrl: z.string().max(500).optional() }).parse(await req.json());
    const order = await prisma.shopVendorOrder.findFirst({
      where: { id: body.vendorOrderId, master: { userId: user.id } },
      include: { vendor: true, master: true }
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const row = await prisma.shopReturn.create({
      data: {
        masterOrderId: order.masterOrderId,
        vendorOrderId: order.id,
        userId: user.id,
        reason: body.reason,
        evidenceUrl: body.evidenceUrl ?? ""
      }
    });
    await notifyShopUser(order.vendor.ownerId, "Return requested", `${order.number}: ${body.reason}`, "/vendor/shop/returns");
    return NextResponse.json({ return: row });
  } catch (e) {
    return jsonError(e);
  }
}
