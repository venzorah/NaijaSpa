import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BookingChat } from "@/components/booking-chat";

export default async function AdminChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminScreen("chats");
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id },
    select: {
      id: true,
      customerId: true,
      customer: { select: { name: true } },
      vendor: { select: { businessName: true } },
      service: { select: { name: true } }
    }
  });
  if (!booking) notFound();
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <AdminPageHeader screen="chats" />
      <p className="mb-1 text-lg font-semibold text-ink">
        {booking.customer.name} · {booking.vendor.businessName}
      </p>
      <p className="mb-3 text-sm text-ink2">{booking.service.name}</p>
      <p className="mb-4 text-sm">
        <Link href={`/admin/bookings`} className="font-semibold text-leaf hover:underline">
          Bookings
        </Link>
      </p>
      <BookingChat
        bookingId={booking.id}
        apiPath={`/api/admin/chats/${booking.id}/messages`}
        layout="thread"
        readOnly
        customerId={booking.customerId}
        customerName={booking.customer.name}
        vendorName={booking.vendor.businessName}
      />
    </div>
  );
}
