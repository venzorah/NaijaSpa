import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { notifyShopUser } from "@/lib/shop/notify";

const STATUSES = ["confirmed", "processing", "dispatched", "delivered", "cancelled"] as const;

export async function GET() {
  try {
    const user = await requireVendor();
    const orders = await prisma.shopVendorOrder.findMany({
      where: { vendorId: user.vendorId },
      include: { items: true, master: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return NextResponse.json({ orders });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        id: z.string(),
        status: z.enum(STATUSES).optional(),
        tracking: z.string().max(120).optional()
      })
      .parse(await req.json());
    const order = await prisma.shopVendorOrder.findFirst({ where: { id: body.id, vendorId: user.vendorId }, include: { master: true } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "pending_payment") return NextResponse.json({ error: "This order is not paid yet." }, { status: 400 });
    const data: { status?: string; tracking?: string; dispatchedAt?: Date; deliveredAt?: Date } = {};
    if (body.tracking != null) data.tracking = body.tracking;
    if (body.status) {
      data.status = body.status;
      if (body.status === "dispatched") data.dispatchedAt = new Date();
      if (body.status === "delivered") data.deliveredAt = new Date();
    }
    const updated = await prisma.shopVendorOrder.update({ where: { id: order.id }, data });
    if (order.master.userId && body.status) {
      await notifyShopUser(order.master.userId, `Order ${order.number} ${body.status}`, `Vendor update on ${order.master.number}.`, `/orders/${order.master.id}`);
    }
    return NextResponse.json({ order: updated });
  } catch (e) {
    return jsonError(e);
  }
}
