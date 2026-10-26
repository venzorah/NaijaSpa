import { prisma } from "@/lib/db";
import { parseReviewInput } from "@/lib/review-input";

export { parseReviewInput };

export async function refreshVendorRating(vendorId: string) {
  const agg = await prisma.review.aggregate({
    where: { vendorId, status: "published" },
    _avg: { rating: true },
    _count: { _all: true }
  });
  const avg = Number(agg._avg.rating ?? 0);
  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ratingAvg: Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0,
      reviewCount: agg._count._all
    }
  });
}

export async function createBookingReview(input: { userId: string; bookingId: string; rating: number; body: string }) {
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, customerId: input.userId },
    include: { service: { select: { slug: true, name: true } }, review: true }
  });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  if (booking.status !== "completed") {
    throw Object.assign(new Error("Confirm you received this service before writing a review"), { status: 400 });
  }
  if (booking.review) throw Object.assign(new Error("You already reviewed this visit"), { status: 409 });
  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      userId: input.userId,
      vendorId: booking.vendorId,
      rating: input.rating,
      body: input.body,
      status: "published"
    }
  });
  await refreshVendorRating(booking.vendorId);
  return {
    ok: true,
    reviewId: review.id,
    serviceSlug: booking.service.slug,
    serviceName: booking.service.name
  };
}
