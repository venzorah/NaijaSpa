import { prisma } from "@/lib/db";
import { rememberedShopOrderIds } from "./cart";

export async function shopOrdersForBuyer(userId?: string | null) {
  const cookieIds = await rememberedShopOrderIds();
  if (!userId && !cookieIds.length) return [];
  return prisma.shopMasterOrder.findMany({
    where: {
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(cookieIds.length ? [{ id: { in: cookieIds } }] : [])
      ]
    },
    include: { vendorOrders: { include: { items: true, vendor: { select: { businessName: true, slug: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function shopOrderForBuyer(id: string, userId?: string | null) {
  const cookieIds = await rememberedShopOrderIds();
  if (!userId && !cookieIds.includes(id)) return null;
  return prisma.shopMasterOrder.findFirst({
    where: {
      id,
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(cookieIds.length ? [{ id: { in: cookieIds } }] : [])
      ]
    },
    include: { vendorOrders: { include: { items: true, vendor: { select: { businessName: true } } } } }
  });
}
