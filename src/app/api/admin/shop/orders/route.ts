import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    const orders = await prisma.shopMasterOrder.findMany({
      include: { vendorOrders: { include: { vendor: { select: { businessName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return NextResponse.json({ orders });
  } catch (e) {
    return jsonError(e);
  }
}
