import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bookingUnlocksVendorContact } from "@/lib/commercial";
import { PageHeader } from "@/components/page-header";
import { BookingChat } from "@/components/booking-chat";

export default async function AccountChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/chats");
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, customerId: user.id },
    select: {
      id: true,
      status: true,
      vendor: { select: { businessName: true } },
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
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-3xl flex-col px-4 pt-6 lg:px-8">
      <PageHeader title={booking.vendor.businessName} subtitle={booking.service.name} backHref="/account/chats" />
      <p className="mb-3 text-sm">
        <Link href={`/account/bookings/${booking.id}`} className="font-semibold text-leaf hover:underline">
          View booking
        </Link>
      </p>
      <BookingChat
        bookingId={booking.id}
        layout="thread"
        lockedHint={unlocked ? undefined : "Chat opens after Paystack confirms payment."}
      />
    </div>
  );
}
