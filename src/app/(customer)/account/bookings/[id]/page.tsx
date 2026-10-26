import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, MessageCircle, Receipt, ShieldCheck, Star, User } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { CancelBooking } from "@/components/cancel-booking";
import { ConfirmVisit } from "@/components/confirm-visit";
import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";
import { locationLabel } from "@/lib/booking-ui";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/bookings");
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, vendor: true, staff: true, payments: true, review: true }
  });
  if (!booking || booking.customerId !== user.id) notFound();
  const active = ["awaiting_payment", "confirmed", "pending"].includes(booking.status);
  const paid = booking.payments.find((p) => p.status === "success");
  const photo = publicWellnessPhoto(booking.service.imageUrl, PHOTOS.massage);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Booking details" subtitle={`Ref ${booking.id.slice(0, 8).toUpperCase()}`} right={<StatusPill status={booking.status} />} />
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="h-40 w-full object-cover" />
        <div className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">{booking.service.name}</h2>
            <Link href={`/providers/${encodeURIComponent(booking.vendor.slug)}`} className="text-sm font-semibold text-leaf hover:underline">
              {booking.vendor.businessName}
            </Link>
          </div>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-3 text-ink">
              <CalendarClock className="h-4 w-4 text-leaf" aria-hidden />
              {booking.startsAt.toLocaleString("en-NG")}
            </li>
            {booking.staff ? (
              <li className="flex items-center gap-3 text-ink">
                <User className="h-4 w-4 text-leaf" aria-hidden />
                {booking.staff.name}
              </li>
            ) : null}
            <li className="flex items-center gap-3 text-ink">
              <MapPin className="h-4 w-4 text-leaf" aria-hidden />
              {locationLabel(booking.locationType)}
              {booking.locationDetails ? ` · ${booking.locationDetails}` : ""}
            </li>
          </ul>
        </div>
      </div>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Receipt className="h-4 w-4 text-goldink" aria-hidden />
          Receipt
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink2">Base price</dt>
            <dd className="text-ink">{formatNgn(booking.basePriceKobo)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink2">Location surcharge</dt>
            <dd className="text-ink">{formatNgn(booking.surchargeKobo)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="font-semibold text-ink">{booking.status === "refunded" ? "Refunded" : "Total"}</dt>
            <dd className="font-bold text-goldink">{formatNgn(booking.customerTotalKobo)}</dd>
          </div>
        </dl>
        {paid ? <p className="mt-3 text-xs text-ink2">Paystack ref {paid.reference}</p> : null}
      </section>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-bg2 p-4 text-xs text-ink2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
        {booking.vendor.cancellationPolicy || "Free cancellation up to 12 hours before the appointment."}
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {active ? <CancelBooking bookingId={booking.id} /> : null}
        {booking.status === "confirmed" || booking.status === "in_progress" ? (
          <ConfirmVisit bookingId={booking.id} />
        ) : null}
        {booking.status === "awaiting_payment" ? (
          <Link href={`/checkout/${booking.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            Pay with Paystack
          </Link>
        ) : null}
        {booking.status === "completed" && !booking.review ? (
          <Link href="/account/reviews" className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            <Star className="mr-1.5 h-4 w-4" aria-hidden /> Write a review
          </Link>
        ) : null}
        {booking.status === "completed" ? (
          <Link
            href={`/services/${encodeURIComponent(booking.service.slug)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold/50 px-5 text-sm font-semibold text-goldink"
          >
            Book again
          </Link>
        ) : null}
        <Link
          href="/account/support"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold"
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> Get help
        </Link>
      </div>
    </div>
  );
}
