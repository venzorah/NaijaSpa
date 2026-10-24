import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { verifyPaystack } from "@/lib/payments";
import { locationLabel } from "@/lib/booking-ui";

export default async function CheckoutVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const user = await getSession();
  const query = await searchParams;
  const reference = query.reference || query.trxref;
  if (!user) {
    redirect(`/login?next=/checkout/verify${reference ? `?reference=${encodeURIComponent(reference)}` : ""}`);
  }
  if (!reference) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-12">
        <h1 className="font-display text-4xl">Payment not found</h1>
        <p className="mt-3 text-sm text-ink2">Paystack did not return a reference. Return to your bookings and try again.</p>
        <Link href="/account/bookings" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-gold px-5 font-bold text-ongold">
          Bookings
        </Link>
      </div>
    );
  }

  const existing = await prisma.payment.findUnique({
    where: { reference },
    include: { booking: { include: { service: true, vendor: true } } }
  });
  if (!existing || (existing.booking && existing.booking.customerId !== user.id)) {
    redirect("/account/bookings");
  }

  let status = existing.status;
  let amountKobo = existing.amountKobo;
  try {
    const verified = await verifyPaystack(reference);
    status = verified.status;
    amountKobo = verified.amountKobo;
  } catch {
    /* keep initialized/pending row; webhook may still confirm */
  }

  const ok = status === "success";
  const booking = existing.booking;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-gold/15">
          <Check className="h-10 w-10 text-goldink" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold text-ink">{ok ? "You’re booked in" : "Payment still pending"}</h1>
        <p className="mt-2 max-w-sm text-sm text-ink2">
          {ok
            ? "Paystack verified this charge. We’ve saved your receipt and the provider has been notified."
            : "If you completed payment, wait a moment and refresh. The Paystack webhook will also confirm the booking."}
        </p>
      </div>

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-card" aria-label="Receipt">
        <div className="flex items-center justify-between border-b border-dashed border-line p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Receipt</p>
            <p className="font-mono text-sm font-semibold text-ink">{existing.reference}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-leaf/15 text-leaf" : "bg-gold/15 text-goldink"}`}>
            {ok ? "Paid · Paystack" : status}
          </span>
        </div>
        <div className="space-y-4 p-5">
          {booking ? (
            <>
              <div>
                <p className="font-semibold text-ink">{booking.service.name}</p>
                <p className="text-sm text-ink2">{booking.vendor.businessName}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-ink2">Date</dt>
                  <dd className="font-semibold text-ink">{booking.startsAt.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink2">Time</dt>
                  <dd className="font-semibold text-ink">{booking.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink2">Setting</dt>
                  <dd className="font-semibold text-ink">{locationLabel(booking.locationType)}</dd>
                </div>
              </dl>
              {booking.locationDetails ? (
                <p className="flex items-start gap-2 text-sm text-ink2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                  {booking.locationDetails}
                </p>
              ) : null}
              <dl className="space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink2">Base price</dt>
                  <dd className="text-ink">{formatNgn(booking.basePriceKobo)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink2">Surcharge</dt>
                  <dd className="text-ink">{formatNgn(booking.surchargeKobo)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base">
                  <dt className="font-semibold text-ink">Total paid</dt>
                  <dd className="font-bold text-goldink">{formatNgn(amountKobo)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm">{formatNgn(amountKobo)} · {existing.reference}</p>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href={booking ? `/account/bookings/${booking.id}` : "/account/bookings"} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
          View my bookings
        </Link>
        {!ok && existing.bookingId ? (
          <Link href={`/checkout/${existing.bookingId}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-gold/50 px-5 text-sm font-semibold text-goldink">
            Try Paystack again
          </Link>
        ) : (
          <Link href="/" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-gold/50 px-5 text-sm font-semibold text-goldink">
            Back to home
          </Link>
        )}
      </div>
    </div>
  );
}
