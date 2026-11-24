import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { sessionCookieDomain } from "@/lib/shop-host";

export const SHOP_CART_COOKIE = "naijaspa_shop_cart";
export const SHOP_ORDER_COOKIE = "naijaspa_shop_orders";

export async function getOrCreateShopCart(userId?: string | null) {
  const jar = await cookies();
  const guestKey = jar.get(SHOP_CART_COOKIE)?.value;
  if (userId) {
    const existing = await prisma.shopCart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (existing) {
      if (guestKey && guestKey !== existing.id) {
        const guest = await prisma.shopCart.findFirst({ where: { guestKey } });
        if (guest) {
          for (const item of await prisma.shopCartItem.findMany({ where: { cartId: guest.id } })) {
            await prisma.shopCartItem.upsert({
              where: { cartId_variantId: { cartId: existing.id, variantId: item.variantId } },
              create: { cartId: existing.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity },
              update: { quantity: { increment: item.quantity } }
            });
          }
          await prisma.shopCart.delete({ where: { id: guest.id } }).catch(() => undefined);
        }
      }
      return existing;
    }
  }
  if (guestKey) {
    const guest = await prisma.shopCart.findFirst({ where: { OR: [{ id: guestKey }, { guestKey }] } });
    if (guest) {
      if (userId && !guest.userId) await prisma.shopCart.update({ where: { id: guest.id }, data: { userId } });
      return guest;
    }
  }
  const cart = await prisma.shopCart.create({ data: { userId: userId || undefined, guestKey: userId ? undefined : crypto.randomUUID() } });
  if (!userId && cart.guestKey) {
    const domain = sessionCookieDomain();
    jar.set(SHOP_CART_COOKIE, cart.guestKey, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      ...(domain ? { domain } : {})
    });
  }
  return cart;
}

export async function rememberedShopOrderIds() {
  const jar = await cookies();
  return (jar.get(SHOP_ORDER_COOKIE)?.value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function rememberShopOrder(orderId: string) {
  const jar = await cookies();
  const next = [orderId, ...(await rememberedShopOrderIds()).filter((id) => id !== orderId)].slice(0, 20);
  const domain = sessionCookieDomain();
  jar.set(SHOP_ORDER_COOKIE, next.join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    ...(domain ? { domain } : {})
  });
}
