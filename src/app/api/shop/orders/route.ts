import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    const orders = await prisma.shopMasterOrder.findMany({
      where: { userId: user.id },
      include: { vendorOrders: { include: { items: true, vendor: { select: { businessName: true, slug: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return NextResponse.json({ orders });
  } catch (e) {
    return jsonError(e);
  }
}
