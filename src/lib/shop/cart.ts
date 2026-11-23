import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SHOP_CART_COOKIE = "naijaspa_shop_cart";

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
    jar.set(SHOP_CART_COOKIE, cart.guestKey, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  return cart;
}
