import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function availableStock(stockOnHand: number, reserved: number) {
  return Math.max(0, stockOnHand - reserved);
}

export async function reserveVariant(tx: Tx, variantId: string, quantity: number, refId: string) {
  if (quantity < 1) throw Object.assign(new Error("Quantity must be at least 1"), { status: 400 });
  await tx.$queryRaw`SELECT id FROM "ShopProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  const variant = await tx.shopProductVariant.findUnique({ where: { id: variantId } });
  if (!variant || !variant.active) throw Object.assign(new Error("This option is unavailable"), { status: 400 });
  if (availableStock(variant.stockOnHand, variant.reserved) < quantity) {
    throw Object.assign(new Error("Not enough stock for this item"), { status: 409 });
  }
  await tx.shopInventoryTxn.create({
    data: { variantId, kind: "reserve", quantity, refType: "order", refId }
  });
  await tx.shopProductVariant.update({
    where: { id: variantId },
    data: { reserved: { increment: quantity } }
  });
}

export async function commitReservation(tx: Tx, variantId: string, quantity: number, refId: string) {
  await tx.$queryRaw`SELECT id FROM "ShopProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  const existing = await tx.shopInventoryTxn.findUnique({
    where: { kind_refType_refId_variantId: { kind: "commit", refType: "order", refId, variantId } }
  });
  if (existing) return;
  await tx.shopInventoryTxn.create({
    data: { variantId, kind: "commit", quantity, refType: "order", refId }
  });
  await tx.shopProductVariant.update({
    where: { id: variantId },
    data: { reserved: { decrement: quantity }, stockOnHand: { decrement: quantity } }
  });
}

export async function releaseReservation(tx: Tx, variantId: string, quantity: number, refId: string) {
  const committed = await tx.shopInventoryTxn.findUnique({
    where: { kind_refType_refId_variantId: { kind: "commit", refType: "order", refId, variantId } }
  });
  if (committed) return;
  const released = await tx.shopInventoryTxn.findUnique({
    where: { kind_refType_refId_variantId: { kind: "release", refType: "order", refId, variantId } }
  });
  if (released) return;
  const reserved = await tx.shopInventoryTxn.findUnique({
    where: { kind_refType_refId_variantId: { kind: "reserve", refType: "order", refId, variantId } }
  });
  if (!reserved) return;
  await tx.shopInventoryTxn.create({
    data: { variantId, kind: "release", quantity, refType: "order", refId }
  });
  await tx.shopProductVariant.update({
    where: { id: variantId },
    data: { reserved: { decrement: quantity } }
  });
}

export async function adjustStock(tx: Tx, variantId: string, quantity: number, note: string) {
  await tx.$queryRaw`SELECT id FROM "ShopProductVariant" WHERE id = ${variantId} FOR UPDATE`;
  await tx.shopInventoryTxn.create({
    data: { variantId, kind: "adjust", quantity, refType: "manual", refId: note.slice(0, 64) }
  });
  await tx.shopProductVariant.update({
    where: { id: variantId },
    data: { stockOnHand: { increment: quantity } }
  });
}
