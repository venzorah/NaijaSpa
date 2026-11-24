import { prisma } from "@/lib/db";
import { SHOP_CONFIG, LIVE_PRODUCT_STATUS } from "./constants";
import { quoteVendorShipping, shopCommissionKobo, shopVendorPayableKobo, unitSaleKobo } from "./quote";
import { shopShipProfileOrDefault } from "./default-shipping";
import { activeShopEntitlement } from "./plans";
import { commitReservation, releaseReservation, reserveVariant } from "./inventory";
import { shopSettlementDays } from "./ensure";
import { notifyShopUser } from "./notify";
import type { Prisma } from "@prisma/client";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

async function nextMasterNumber() {
  const year = new Date().getUTCFullYear();
  const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.orderSeq } });
  const current = Number(row?.value ?? "0");
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await prisma.systemConfig.upsert({
    where: { key: SHOP_CONFIG.orderSeq },
    create: { key: SHOP_CONFIG.orderSeq, value: String(next) },
    update: { value: String(next) }
  });
  return `NS-${year}-${String(next).padStart(5, "0")}`;
}

export async function loadCartQuote(cartId: string, destState: string, pickup = false) {
  const cart = await prisma.shopCart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { vendor: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
          variant: true
        }
      }
    }
  });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });
  const byVendor = new Map<string, typeof cart.items>();
  for (const item of cart.items) {
    const list = byVendor.get(item.product.vendorId) ?? [];
    list.push(item);
    byVendor.set(item.product.vendorId, list);
  }
  const groups = [];
  for (const [vendorId, items] of byVendor) {
    const vendor = items[0]?.product.vendor;
    if (!vendor || vendor.shopStatus !== "approved") {
      groups.push({
        vendorId,
        businessName: vendor?.businessName ?? "Seller",
        productKobo: 0,
        shippingKobo: 0,
        commissionBps: 0,
        commissionKobo: 0,
        vendorPayableKobo: 0,
        planCode: "",
        shipOk: false,
        shipReason: "This seller is not approved for Shop.",
        items
      });
      continue;
    }
    const productKobo = items.reduce((sum, item) => sum + unitSaleKobo(item.variant.priceKobo, item.variant.compareKobo) * item.quantity, 0);
    const stored = await prisma.shopShippingProfile.findUnique({
      where: { vendorId },
      include: { zones: true }
    });
    const profile = shopShipProfileOrDefault(vendor.state, stored);
    const ship = quoteVendorShipping(vendor.state, destState, productKobo, profile, pickup);
    const ent = await activeShopEntitlement(vendorId);
    const commissionKobo = ship.ok ? shopCommissionKobo(productKobo, ent.commissionBps) : 0;
    const shippingKobo = ship.ok ? ship.feeKobo : 0;
    groups.push({
      vendorId,
      businessName: vendor.businessName,
      productKobo,
      shippingKobo,
      commissionBps: ent.commissionBps,
      commissionKobo,
      vendorPayableKobo: ship.ok ? shopVendorPayableKobo(productKobo, commissionKobo, shippingKobo) : 0,
      planCode: ent.planCode,
      shipOk: ship.ok,
      shipReason: ship.ok ? undefined : ship.reason,
      etaDays: ship.ok ? ship.etaDays : null,
      items
    });
  }
  const productKobo = groups.reduce((s, g) => s + g.productKobo, 0);
  const shippingKobo = groups.reduce((s, g) => s + (g.shipOk ? g.shippingKobo : 0), 0);
  return {
    cart,
    groups,
    productKobo,
    shippingKobo,
    totalKobo: productKobo + shippingKobo,
    blocked: groups.filter((g) => !g.shipOk)
  };
}

export async function placeShopOrder(input: {
  cartId: string;
  userId?: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  neighbourhood?: string;
  pickup?: boolean;
}) {
  const quote = await loadCartQuote(input.cartId, input.state, input.pickup);
  if (!quote.cart.items.length) throw Object.assign(new Error("Your cart is empty"), { status: 400 });
  if (quote.blocked.length) {
    throw Object.assign(new Error(quote.blocked[0]?.shipReason || "Some items cannot ship to this address"), { status: 400 });
  }
  for (const item of quote.cart.items) {
    if (item.product.status !== LIVE_PRODUCT_STATUS) {
      throw Object.assign(new Error(`${item.product.name} is no longer available`), { status: 400 });
    }
  }
  const number = await nextMasterNumber();
  const master = await prisma.$transaction(async (tx) => {
    const created = await tx.shopMasterOrder.create({
      data: {
        number,
        userId: input.userId,
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        neighbourhood: input.neighbourhood ?? "",
        status: "pending_payment",
        productKobo: quote.productKobo,
        shippingKobo: quote.shippingKobo,
        totalKobo: quote.totalKobo
      }
    });
    let index = 0;
    for (const group of quote.groups) {
      const letter = LETTERS[index] ?? String(index + 1);
      index += 1;
      const vendorOrder = await tx.shopVendorOrder.create({
        data: {
          masterOrderId: created.id,
          vendorId: group.vendorId,
          number: `${number}-${letter}`,
          status: "pending_payment",
          productKobo: group.productKobo,
          shippingKobo: group.shippingKobo,
          commissionBps: group.commissionBps,
          commissionKobo: group.commissionKobo,
          vendorPayableKobo: group.vendorPayableKobo,
          planCodeSnapshot: group.planCode
        }
      });
      for (const item of group.items) {
        const unit = unitSaleKobo(item.variant.priceKobo, item.variant.compareKobo);
        await tx.shopOrderItem.create({
          data: {
            vendorOrderId: vendorOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            nameSnapshot: `${item.product.name}${item.variant.name && item.variant.name !== "Default" ? ` · ${item.variant.name}` : ""}`,
            skuSnapshot: item.variant.sku,
            quantity: item.quantity,
            unitKobo: unit,
            lineKobo: unit * item.quantity
          }
        });
        await reserveVariant(tx, item.variantId, item.quantity, created.id);
      }
    }
    await tx.shopCartItem.deleteMany({ where: { cartId: input.cartId } });
    return created;
  });
  return master;
}

export async function fulfillShopOrderPayment(paymentId: string, tx: Prisma.TransactionClient) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.purpose !== "shop_order" || !payment.shopMasterOrderId) return;
  const master = await tx.shopMasterOrder.findUnique({
    where: { id: payment.shopMasterOrderId },
    include: { vendorOrders: { include: { items: true, vendor: true } } }
  });
  if (!master || master.status === "paid") return;
  await tx.shopMasterOrder.update({ where: { id: master.id }, data: { status: "paid" } });
  const holdDays = await shopSettlementDays();
  for (const vo of master.vendorOrders) {
    await tx.shopVendorOrder.update({ where: { id: vo.id }, data: { status: "confirmed" } });
    for (const item of vo.items) {
      await commitReservation(tx, item.variantId, item.quantity, master.id);
    }
    await tx.shopLedgerEntry.create({
      data: {
        vendorId: vo.vendorId,
        vendorOrderId: vo.id,
        kind: "sale",
        amountKobo: vo.productKobo,
        note: "Product subtotal"
      }
    });
    await tx.shopLedgerEntry.create({
      data: {
        vendorId: vo.vendorId,
        vendorOrderId: vo.id,
        kind: "commission",
        amountKobo: -vo.commissionKobo,
        note: `${vo.planCodeSnapshot} ${vo.commissionBps / 100}%`
      }
    });
    if (vo.shippingKobo) {
      await tx.shopLedgerEntry.create({
        data: {
          vendorId: vo.vendorId,
          vendorOrderId: vo.id,
          kind: "shipping",
          amountKobo: vo.shippingKobo,
          note: "Shipping collected"
        }
      });
    }
    const availableAt = new Date(Date.now() + holdDays * 86_400_000);
    await tx.shopSettlement.create({
      data: {
        vendorId: vo.vendorId,
        vendorOrderId: vo.id,
        amountKobo: vo.vendorPayableKobo,
        status: "held",
        availableAt
      }
    });
  }
}

export async function notifyShopOrderPaid(masterOrderId: string) {
  const master = await prisma.shopMasterOrder.findUnique({
    where: { id: masterOrderId },
    include: { vendorOrders: { include: { vendor: { select: { ownerId: true } } } } }
  });
  if (!master) return;
  for (const vo of master.vendorOrders) {
    if (vo.vendor.ownerId) {
      await notifyShopUser(vo.vendor.ownerId, "New Shop order", `${master.number} includes ${vo.number}.`, "/vendor/shop/orders");
    }
  }
  if (master.userId) {
    await notifyShopUser(master.userId, "Shop order confirmed", `Payment received for ${master.number}.`, `/orders/${master.id}`);
  }
}

export async function failShopOrderPayment(masterOrderId: string) {
  const master = await prisma.shopMasterOrder.findUnique({
    where: { id: masterOrderId },
    include: { vendorOrders: { include: { items: true } } }
  });
  if (!master || master.status === "paid") return;
  await prisma.$transaction(async (tx) => {
    await tx.shopMasterOrder.update({ where: { id: master.id }, data: { status: "failed" } });
    for (const vo of master.vendorOrders) {
      await tx.shopVendorOrder.update({ where: { id: vo.id }, data: { status: "cancelled" } });
      for (const item of vo.items) {
        await releaseReservation(tx, item.variantId, item.quantity, master.id);
      }
    }
  });
}

export async function fulfillShopSubscriptionPayment(paymentId: string, tx: Prisma.TransactionClient) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.purpose !== "shop_subscription" || payment.shopVendorSubscriptionId) return;
  let meta: { vendorId?: string; planCode?: string } = {};
  try {
    const parsed = JSON.parse(payment.rawPayload || "{}") as { metadata?: { vendorId?: string; planCode?: string } };
    meta = parsed.metadata ?? {};
  } catch {
    meta = {};
  }
  if (!meta.vendorId || !meta.planCode) return;
  const plan = await tx.shopPlan.findUnique({ where: { code: meta.planCode } });
  if (!plan) return;
  const at = new Date();
  await tx.shopVendorSubscription.updateMany({ where: { vendorId: meta.vendorId, status: "active" }, data: { status: "expired" } });
  const sub = await tx.shopVendorSubscription.create({
    data: {
      vendorId: meta.vendorId,
      planId: plan.id,
      status: "active",
      source: "paystack",
      startsAt: at,
      endsAt: new Date(at.getTime() + plan.durationDays * 86_400_000)
    }
  });
  await tx.payment.update({ where: { id: payment.id }, data: { shopVendorSubscriptionId: sub.id } });
}
