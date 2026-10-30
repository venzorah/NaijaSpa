import { prisma } from "./db";

const CANCELLABLE_STATES = ["pending", "awaiting_payment", "confirmed", "cancellation_requested"];
const REASON = "Account deletion requested; any refund requires finance review under the cancellation policy.";

export async function requestAccountDeletion(userId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    // Booking creation takes the same customer lock, so no reservation can slip
    // between the cancellation scan and the deletion flag being saved.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { deletionRequestedAt: true } });
    const upcoming = await tx.booking.findMany({ where: { customerId: userId, startsAt: { gt: now }, status: { in: CANCELLABLE_STATES } }, orderBy: { id: "asc" }, select: { id: true } });
    let cancelled = 0, refundReview = 0;
    for (const { id } of upcoming) {
      // Payment confirmation takes this lock too. Re-read after acquiring it so
      // a concurrent payment either gets queued here or follows late-payment handling.
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
      const booking = await tx.booking.findUniqueOrThrow({ where: { id }, include: {
        payments: { where: { status: "success", purpose: "booking" }, include: { refunds: true } }
      } });
      if (booking.customerId !== userId || booking.startsAt <= now || !CANCELLABLE_STATES.includes(booking.status)) continue;
      const toStatus = booking.payments.length ? "refund_pending" : "cancelled";
      for (const payment of booking.payments) {
        if (!payment.refunds.length) await tx.refund.create({ data: {
          paymentId: payment.id, bookingId: id, amountKobo: payment.amountKobo, status: "pending", reason: REASON
        } });
      }
      await tx.booking.update({ where: { id }, data: {
        status: toStatus, cancelReason: REASON,
        statusHistory: { create: { fromStatus: booking.status, toStatus, actorId: userId, note: REASON } }
      } });
      await tx.vendorEarning.updateMany({ where: { bookingId: id, status: "pending" }, data: { status: "cancelled" } });
      cancelled++;
      if (toStatus === "refund_pending") refundReview++;
    }
    await tx.user.update({ where: { id: userId }, data: { deletionRequestedAt: user.deletionRequestedAt || now } });
    if (!user.deletionRequestedAt || cancelled) await tx.auditLog.create({ data: {
      actorId: userId, action: "account.deletion_request", entityType: "User", entityId: userId,
      afterJson: JSON.stringify({ deletionRequested: true, cancelledBookings: cancelled, refundReviewBookings: refundReview })
    } });
    return { cancelledBookings: cancelled, refundReviewBookings: refundReview };
  }, { isolationLevel: "ReadCommitted", timeout: 15000 });
}
