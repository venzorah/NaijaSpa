import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { WriteReviewForm } from "@/components/write-review-form";
import { StarRating } from "@/components/star-rating";

export default async function WriteReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/account/bookings/${id}/review`);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, vendor: true, review: true }
  });
  if (!booking || booking.customerId !== user.id) notFound();
  if (booking.status !== "completed") redirect(`/account/bookings/${booking.id}`);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader
        title="Write a review"
        subtitle="Rate this visit. Your review is published on the service page."
        backHref={`/account/bookings/${booking.id}`}
      />
      {booking.review ? (
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="text-sm font-semibold text-ink">You already reviewed this visit.</p>
          <div className="mt-2">
            <StarRating value={booking.review.rating} readOnly size="sm" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink">{booking.review.body}</p>
          <Link
            href={`/services/${encodeURIComponent(booking.service.slug)}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
          >
            View on service page
          </Link>
        </div>
      ) : (
        <WriteReviewForm
          bookingId={booking.id}
          serviceName={booking.service.name}
          vendorName={booking.vendor.businessName}
          serviceSlug={booking.service.slug}
        />
      )}
    </div>
  );
}
