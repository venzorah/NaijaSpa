import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { shopOrdersForBuyer } from "@/lib/shop/order-access";

export async function GET() {
  try {
    const user = await getSession();
    const orders = await shopOrdersForBuyer(user?.id);
    return NextResponse.json({ orders });
  } catch (e) {
    return jsonError(e);
  }
}
