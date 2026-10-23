import { redirect } from "next/navigation";
import { BookingStepper } from "@/components/booking-stepper";
import { PaystackCheckout } from "@/components/paystack-checkout";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getSession();
  const { bookingId } = await params;
  if (!user) redirect(`/login?next=/checkout/${bookingId}`);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, vendor: true }
  });
  if (!booking || booking.customerId !== user.id) redirect("/account/bookings");

  const confirmed = booking.status === "confirmed";
  const payable = booking.status === "awaiting_payment" || booking.status === "pending" || confirmed;

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:py-8">
      <BookingStepper current={4} />
      <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">{confirmed ? "Paid" : "Pay with Paystack"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink2">
        Card, bank, USSD, transfer and mobile money are collected by Paystack. NaijaSpa never stores card numbers.
        Your booking confirms after Paystack verifies the charge.
      </p>
      <div className="mt-6 rounded-3xl border border-line bg-card p-4">
        <p className="font-semibold">{booking.service.name}</p>
        <p className="mt-1 text-xs text-ink2">{booking.vendor.businessName}</p>
        <p className="mt-4 break-words font-display text-3xl">{formatNgn(booking.customerTotalKobo)}</p>
        <p className="mt-1 text-xs text-ink2">NGN · charged in kobo on Paystack</p>
      </div>
      {payable ? (
        <PaystackCheckout
          bookingId={booking.id}
          amountLabel={formatNgn(booking.customerTotalKobo)}
          alreadyConfirmed={confirmed}
        />
      ) : (
        <p className="mt-6 text-sm text-ink2">This booking cannot be paid in its current state ({booking.status}).</p>
      )}
    </div>
  );
}
