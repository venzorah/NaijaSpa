import { prisma, getCommercialConfig } from "./db";
import { locationAddonKobo, quoteBooking, type LocationType } from "./commercial";
import { vendorEntitlement } from "./entitlements";
import { audit } from "./audit";
import { CUSTOMER_MEMBERSHIP_ENABLED, membershipPerks } from "./membership";
import type { Prisma } from "@prisma/client";
import { appointmentWindow, matchingAvailability } from "./booking-availability";

export const BOOKING_STATES = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "in_progress",
  "completed",
  "cancellation_requested",
  "cancelled",
  "refund_pending",
  "refunded",
  "no_show"
] as const;

export async function createBooking(input: {
  customerId: string;
  serviceId: string;
  staffId?: string | null;
  locationType: LocationType;
  locationDetails: string;
  startsAt: Date;
  addonIds?: string[];
  idempotencyKey: string;
  promoCode?: string;
}) {
  const existing = await prisma.booking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.customerId !== input.customerId) throw Object.assign(new Error("Booking key already used"), { status: 409 });
    return existing;
  }
  if (!Number.isFinite(input.startsAt.getTime()) || input.startsAt <= new Date()) {
    throw Object.assign(new Error("Choose a valid future appointment"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.findUniqueOrThrow({
      where: { id: input.serviceId },
      include: { vendor: true, addons: true, staff: { select: { staffId: true } } }
    });
    if (!service.active || service.vendor.visibility !== "public" || service.vendor.applicationStatus !== "approved") {
      throw Object.assign(new Error("Service unavailable"), { status: 400 });
    }
    // Serialize reservations for this vendor before checking availability. A second
    // request sees the first committed reservation under PostgreSQL READ COMMITTED.
    await tx.$queryRaw`SELECT id FROM "Vendor" WHERE id = ${service.vendorId} FOR NO KEY UPDATE`;
    const retry = await tx.booking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (retry) {
      if (retry.customerId !== input.customerId) throw Object.assign(new Error("Booking key already used"), { status: 409 });
      return retry;
    }
    const loc = input.locationType;
    if (loc === "spa" && !service.spaEnabled) throw Object.assign(new Error("Spa/Office not offered"), { status: 400 });
    if (loc === "hotel" && !service.hotelEnabled) throw Object.assign(new Error("Hotel service not offered"), { status: 400 });
    if (loc === "home" && !service.homeEnabled) throw Object.assign(new Error("Home service not offered"), { status: 400 });
    if ((loc === "hotel" || loc === "home") && !input.locationDetails.trim()) {
      throw Object.assign(new Error("Location details required"), { status: 400 });
    }

    const selectedAddons = service.addons.filter((a) => input.addonIds?.includes(a.id));
    if (new Set(input.addonIds ?? []).size !== selectedAddons.length) {
      throw Object.assign(new Error("Invalid service add-on"), { status: 400 });
    }
    const endsAt = new Date(input.startsAt.getTime() + (service.durationMin + selectedAddons.reduce((n, a) => n + a.durationMin, 0)) * 60_000);
    const window = appointmentWindow(input.startsAt, endsAt);
    const staff = await tx.vendorStaff.findMany({
      where: { vendorId: service.vendorId, active: true, services: { some: { serviceId: service.id } },
        ...(input.staffId ? { id: input.staffId } : {}) }, orderBy: { id: "asc" }
    });
    if ((input.staffId || service.staff.length) && !staff.length) throw Object.assign(new Error("Therapist is not available for this service"), { status: 400 });
    const slots = await tx.availabilitySlot.findMany({ where: { vendorId: service.vendorId } });
    // Assign an available therapist even when the customer did not choose one.
    // Vendors with no assigned therapists reserve their shared business capacity.
    let staffId: string | null | undefined;
    for (const candidate of staff.length ? staff.map((s) => s.id) : [null]) {
      const slot = matchingAvailability(slots, candidate, window);
      if (!slot) continue;
      if (candidate && await tx.timeOff.findFirst({ where: {
        staffId: candidate, startsAt: { lt: endsAt }, endsAt: { gt: input.startsAt }
      } })) continue;
      const bufferMs = Math.max(slot.bufferMin, ...slots.map((s) => s.bufferMin)) * 60_000;
      const clash = await tx.booking.findFirst({ where: {
        vendorId: service.vendorId,
        status: { in: ["pending", "awaiting_payment", "confirmed", "in_progress", "cancellation_requested"] },
        ...(candidate ? { OR: [{ staffId: candidate }, { staffId: null }] } : {}),
        startsAt: { lt: new Date(endsAt.getTime() + bufferMs) },
        endsAt: { gt: new Date(input.startsAt.getTime() - bufferMs) }
      } });
      if (!clash) { staffId = candidate; break; }
    }
    if (staffId === undefined) throw Object.assign(new Error("That slot is outside working hours or no longer available"), { status: 409 });

    const entitlement = await vendorEntitlement(service.vendorId);
    const config = await getCommercialConfig();
    const addonKobo = service.addons
      .filter((a) => input.addonIds?.includes(a.id))
      .reduce((s, a) => s + a.priceKobo, 0);
    const now = new Date();
    const membership = CUSTOMER_MEMBERSHIP_ENABLED
      ? await tx.customerMembership.findFirst({
          where: { userId: input.customerId, status: "active", endsAt: { gte: now } },
          include: { plan: true }
        })
      : null;
    const perks = membership && membership.plan.active ? membershipPerks(membership.plan.benefits) : null;
    let locationAddon = locationAddonKobo(loc, service);
    if (perks?.waiveAllSurcharges) locationAddon = 0;
    else if (perks?.waiveHomeMonthly && loc === "home") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const used = await tx.booking.count({
        where: {
          customerId: input.customerId,
          locationType: "home",
          surchargeKobo: 0,
          startsAt: { gte: monthStart },
          status: { in: ["awaiting_payment", "confirmed", "in_progress", "completed"] }
        }
      });
      if (used === 0) locationAddon = 0;
    }
    let discountKobo = 0;
    if (perks?.bookingPercentOff) {
      discountKobo += Math.round((service.basePriceKobo * perks.bookingPercentOff) / 100);
    }
    if (input.promoCode) {
      const promo = await tx.promotion.findUnique({ where: { code: input.promoCode.toUpperCase() } });
      if (promo && promo.active && promo.startsAt <= now && promo.endsAt >= now) {
        discountKobo += promo.amountKobo || Math.round((service.basePriceKobo * promo.percentOff) / 100);
      }
    }
    const ceiling = service.basePriceKobo + locationAddon + addonKobo;
    if (discountKobo > ceiling) discountKobo = ceiling;
    const quote = quoteBooking({
      basePriceKobo: service.basePriceKobo,
      location: loc,
      locationAddonKobo: locationAddon,
      addonKobo,
      discountKobo,
      entitlement,
      config
    });

    const activeSub = await tx.vendorSubscription.findFirst({
      where: { vendorId: service.vendorId, status: { in: ["active", "grace"] } },
      orderBy: { endsAt: "desc" }
    });

    const booking = await tx.booking.create({
      data: {
        customerId: input.customerId,
        vendorId: service.vendorId,
        serviceId: service.id,
        staffId,
        locationType: loc,
        locationDetails: input.locationDetails,
        startsAt: input.startsAt,
        endsAt,
        status: "awaiting_payment",
        currency: "NGN",
        basePriceKobo: quote.basePriceKobo,
        surchargeKobo: quote.surchargeKobo,
        discountKobo: quote.discountKobo,
        feesKobo: quote.feesKobo,
        commissionBps: quote.commissionBps,
        commissionKobo: quote.commissionKobo,
        customerTotalKobo: quote.customerTotalKobo,
        vendorPayableKobo: quote.vendorPayableKobo,
        surchargeRecipient: quote.surchargeRecipient,
        subscriptionId: activeSub?.id,
        planCodeSnapshot: quote.planCode,
        idempotencyKey: input.idempotencyKey,
        statusHistory: { create: { toStatus: "awaiting_payment", actorId: input.customerId } }
      }
    });
    return booking;
  }, { isolationLevel: "ReadCommitted" });
}

export async function confirmBookingFromPayment(bookingId: string, actorId?: string, client?: Prisma.TransactionClient): Promise<import("@prisma/client").Booking> {
  if (!client) return prisma.$transaction((tx) => confirmBookingFromPayment(bookingId, actorId, tx));
  await client.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
  const booking = await client.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const paid = await client.payment.findFirst({ where: { bookingId, status: "success", amountKobo: booking.customerTotalKobo, currency: booking.currency, purpose: "booking" } });
  if (!paid) throw Object.assign(new Error("Successful payment required"), { status: 409 });
  if (["confirmed", "in_progress", "completed", "no_show", "cancellation_requested", "refund_pending", "refunded"].includes(booking.status)) return booking;
  if (booking.status === "cancelled") {
    // A delayed charge must stay recorded without reviving a cancelled appointment.
    const refund = await client.refund.findFirst({ where: { paymentId: paid.id, bookingId } });
    if (!refund) await client.refund.create({ data: {
      paymentId: paid.id, bookingId, amountKobo: paid.amountKobo, status: "pending",
      reason: "Payment received for a cancelled appointment"
    } });
    return client.booking.update({ where: { id: bookingId }, data: {
      status: "refund_pending",
      statusHistory: { create: { fromStatus: booking.status, toStatus: "refund_pending", actorId } }
    } });
  }
  if (booking.status !== "awaiting_payment" && booking.status !== "pending") {
    throw Object.assign(new Error("Cannot confirm booking in current state"), { status: 400 });
  }
  const updated = await client.booking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      statusHistory: { create: { fromStatus: booking.status, toStatus: "confirmed", actorId } },
      earning: {
        upsert: { update: {}, create: {
          vendorId: booking.vendorId,
          payableKobo: booking.vendorPayableKobo,
          commissionKobo: booking.commissionKobo,
          surchargeKobo: booking.surchargeKobo,
          status: "pending"
        } }
      }
    }
  });
  await client.notification.create({
    data: {
      userId: booking.customerId,
      title: "Booking confirmed",
      body: "Your NaijaSpa appointment is confirmed. We will send a reminder before your visit."
    }
  });
  return updated;
}

export async function requestCancellation(bookingId: string, userId: string, reason: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.customerId !== userId) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (!["awaiting_payment", "confirmed", "pending"].includes(booking.status)) {
    throw Object.assign(new Error("This booking cannot be cancelled"), { status: 400 });
  }
  const hours = (booking.startsAt.getTime() - Date.now()) / 36e5;
  const toStatus = hours > 24 && booking.status === "awaiting_payment" ? "cancelled" : "cancellation_requested";
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: toStatus,
      cancelReason: reason,
      statusHistory: { create: { fromStatus: booking.status, toStatus, actorId: userId, note: reason } }
    }
  });
  await audit({
    actorId: userId,
    action: "booking.cancel_request",
    entityType: "Booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: toStatus }
  });
  return updated;
}
