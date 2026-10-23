import { prisma, getCommercialConfig } from "./db";
import { quoteBooking, type LocationType } from "./commercial";
import { vendorEntitlement } from "./entitlements";
import { audit } from "./audit";

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
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.findUniqueOrThrow({
      where: { id: input.serviceId },
      include: { vendor: true, addons: true }
    });
    if (!service.active || service.vendor.visibility !== "public" || service.vendor.applicationStatus !== "approved") {
      throw Object.assign(new Error("Service unavailable"), { status: 400 });
    }
    const loc = input.locationType;
    if (loc === "spa" && !service.spaEnabled) throw Object.assign(new Error("Spa/Office not offered"), { status: 400 });
    if (loc === "hotel" && !service.hotelEnabled) throw Object.assign(new Error("Hotel service not offered"), { status: 400 });
    if (loc === "home" && !service.homeEnabled) throw Object.assign(new Error("Home service not offered"), { status: 400 });
    if ((loc === "hotel" || loc === "home") && !input.locationDetails.trim()) {
      throw Object.assign(new Error("Location details required"), { status: 400 });
    }

    const endsAt = new Date(input.startsAt.getTime() + service.durationMin * 60_000);
    const clash = await tx.booking.findFirst({
      where: {
        vendorId: service.vendorId,
        status: { in: ["pending", "awaiting_payment", "confirmed", "in_progress"] },
        staffId: input.staffId ?? undefined,
        startsAt: { lt: endsAt },
        endsAt: { gt: input.startsAt }
      }
    });
    if (clash) throw Object.assign(new Error("That slot is no longer available"), { status: 409 });

    const entitlement = await vendorEntitlement(service.vendorId);
    const config = await getCommercialConfig();
    const addonKobo = service.addons
      .filter((a) => input.addonIds?.includes(a.id))
      .reduce((s, a) => s + a.priceKobo, 0);
    let discountKobo = 0;
    if (input.promoCode) {
      const promo = await tx.promotion.findUnique({ where: { code: input.promoCode.toUpperCase() } });
      const now = new Date();
      if (promo && promo.active && promo.startsAt <= now && promo.endsAt >= now) {
        discountKobo = promo.amountKobo || Math.round((service.basePriceKobo * promo.percentOff) / 100);
      }
    }
    const quote = quoteBooking({
      basePriceKobo: service.basePriceKobo,
      location: loc,
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
        staffId: input.staffId ?? null,
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
  });
}

export async function confirmBookingFromPayment(bookingId: string, actorId?: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status === "confirmed") return booking;
  if (booking.status !== "awaiting_payment" && booking.status !== "pending") {
    throw Object.assign(new Error("Cannot confirm booking in current state"), { status: 400 });
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      statusHistory: { create: { fromStatus: booking.status, toStatus: "confirmed", actorId } },
      earning: {
        create: {
          vendorId: booking.vendorId,
          payableKobo: booking.vendorPayableKobo,
          commissionKobo: booking.commissionKobo,
          surchargeKobo: booking.surchargeKobo,
          status: "pending"
        }
      }
    }
  });
  await prisma.notification.create({
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
