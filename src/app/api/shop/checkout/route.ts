import { NextResponse } from "next/server";
import { z } from "zod";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getOrCreateShopCart } from "@/lib/shop/cart";
import { loadCartQuote, placeShopOrder } from "@/lib/shop/checkout";
import { initPayment } from "@/lib/payments";
import { SHOP_PUBLIC_URL } from "@/lib/shop-host";
import { publicOriginFromRequest } from "@/lib/public-origin";

const addressSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(7).max(24),
  address: z.string().min(4).max(240),
  city: z.string().min(2).max(80),
  state: z.enum(NIGERIA_STATES),
  neighbourhood: z.string().max(80).optional(),
  pickup: z.boolean().optional()
});

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const body = z.object({ preview: z.boolean().optional() }).merge(addressSchema).parse(await req.json());
    const cart = await getOrCreateShopCart(user?.id);
    const quote = await loadCartQuote(cart.id, body.state, body.pickup);
    if (body.preview) return NextResponse.json({ quote: { groups: quote.groups.map(({ items, ...rest }) => rest), productKobo: quote.productKobo, shippingKobo: quote.shippingKobo, totalKobo: quote.totalKobo, blocked: quote.blocked.map((g) => ({ vendorId: g.vendorId, reason: g.shipReason })) } });
    if (quote.blocked.length) return NextResponse.json({ error: quote.blocked[0]?.shipReason, quote }, { status: 400 });
    const order = await placeShopOrder({
      cartId: cart.id,
      userId: user?.id,
      email: body.email,
      name: body.name,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      neighbourhood: body.neighbourhood,
      pickup: body.pickup
    });
    const origin = publicOriginFromRequest(req).includes("shop.") ? publicOriginFromRequest(req) : SHOP_PUBLIC_URL;
    const pay = await initPayment({
      email: body.email,
      amountKobo: order.totalKobo,
      purpose: "shop_order",
      shopMasterOrderId: order.id,
      customerId: user?.id,
      callbackPath: "/checkout/verify",
      callbackOrigin: origin,
      metadata: { shopMasterOrderId: order.id }
    });
    return NextResponse.json({ order, pay });
  } catch (e) {
    return jsonError(e);
  }
}
