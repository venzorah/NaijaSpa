import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { verifyPaystack } from "@/lib/payments";

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
    include: { booking: { select: { customerId: true, id: true } } }
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

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{ok ? "Confirmed" : "Not confirmed"}</p>
      <h1 className="mt-3 font-display text-4xl">{ok ? "Payment received" : "Payment still pending"}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink2">
        {ok
          ? "Paystack verified this charge. Your booking is confirmed."
          : "If you completed payment, wait a moment and refresh. The Paystack webhook will also confirm the booking."}
      </p>
      <p className="mt-6 rounded-3xl border border-line bg-card p-4 text-sm">
        {formatNgn(amountKobo)} · {existing.reference}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account/bookings" className="inline-flex min-h-12 items-center rounded-full bg-gold px-5 font-bold text-ongold">
          View bookings
        </Link>
        {!ok && existing.bookingId ? (
          <Link
            href={`/checkout/${existing.bookingId}`}
            className="inline-flex min-h-12 items-center rounded-full border border-line px-5 font-semibold"
          >
            Try Paystack again
          </Link>
        ) : null}
      </div>
    </div>
  );
}
