import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { rememberShopOrder } from "@/lib/shop/cart";

export async function POST(req: Request) {
  try {
    await rateLimit(`shop-order-lookup:${clientAddress(req)}`, 12, 60_000);
    const body = z.object({ email: z.string().email(), number: z.string().min(4).max(40) }).parse(await req.json());
    const order = await prisma.shopMasterOrder.findFirst({
      where: { email: body.email.toLowerCase(), number: body.number.trim().toUpperCase() },
      select: { id: true, number: true, status: true }
    });
    if (!order) return NextResponse.json({ error: "No order matched that email and order number." }, { status: 404 });
    await rememberShopOrder(order.id);
    return NextResponse.json({ order });
  } catch (e) {
    return jsonError(e);
  }
}
