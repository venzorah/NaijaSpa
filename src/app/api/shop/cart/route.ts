import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getOrCreateShopCart } from "@/lib/shop/cart";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { availableStock } from "@/lib/shop/inventory";

export async function GET() {
  try {
    const user = await getSession();
    const cart = await getOrCreateShopCart(user?.id);
    const full = await prisma.shopCart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, vendor: { select: { id: true, businessName: true, slug: true, state: true } } } },
            variant: true
          }
        }
      }
    });
    return NextResponse.json({ cart: full });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const body = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(20) }).parse(await req.json());
    const variant = await prisma.shopProductVariant.findUnique({
      where: { id: body.variantId },
      include: { product: true }
    });
    if (!variant || variant.product.status !== LIVE_PRODUCT_STATUS || !variant.active) {
      return NextResponse.json({ error: "This product is not available" }, { status: 400 });
    }
    if (availableStock(variant.stockOnHand, variant.reserved) < body.quantity) {
      return NextResponse.json({ error: "Not enough stock" }, { status: 409 });
    }
    const cart = await getOrCreateShopCart(user?.id);
    const item = await prisma.shopCartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: { cartId: cart.id, productId: variant.productId, variantId: variant.id, quantity: body.quantity },
      update: { quantity: { increment: body.quantity } }
    });
    return NextResponse.json({ item });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    const body = z.object({ itemId: z.string(), quantity: z.number().int().min(0).max(20) }).parse(await req.json());
    const cart = await getOrCreateShopCart(user?.id);
    const item = await prisma.shopCartItem.findFirst({ where: { id: body.itemId, cartId: cart.id } });
    if (!item) return NextResponse.json({ error: "Item not in cart" }, { status: 404 });
    if (body.quantity === 0) await prisma.shopCartItem.delete({ where: { id: item.id } });
    else await prisma.shopCartItem.update({ where: { id: item.id }, data: { quantity: body.quantity } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
