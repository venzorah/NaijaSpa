import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { bookingUnlocksVendorContact } from "@/lib/commercial";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { BookingChat } from "@/components/booking-chat";

export default async function VendorChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireVendor();
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, vendorId: user.vendorId },
    select: {
      id: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
      payments: { select: { status: true } }
    }
  });
  if (!booking) notFound();
  const unlocked = bookingUnlocksVendorContact(
    booking.status,
    booking.payments.some((p) => p.status === "success")
  );
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <VendorPageHeader title={booking.customer.name} description={booking.service.name} />
      <p className="mb-3 text-sm">
        <Link href="/vendor/bookings" className="font-semibold text-leaf hover:underline">
          Open bookings inbox
        </Link>
      </p>
      <BookingChat
        bookingId={booking.id}
        apiPath={`/api/vendor/bookings/${booking.id}/messages`}
        layout="thread"
        lockedHint={unlocked ? undefined : "Chat opens after Paystack confirms payment."}
      />
    </div>
  );
}
