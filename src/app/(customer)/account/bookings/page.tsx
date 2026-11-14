import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingsTabs } from "@/components/bookings-tabs";
import { PageHeader } from "@/components/page-header";
import { publicWellnessPhoto } from "@/lib/photos";
import { PHOTOS } from "@/lib/photos";

export default async function BookingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/bookings");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    select: {
      id: true,
      status: true,
      startsAt: true,
      locationType: true,
      customerTotalKobo: true,
      service: { select: { name: true, imageUrl: true } },
      vendor: { select: { businessName: true } }
    },
    orderBy: { startsAt: "desc" },
    take: 100
  });
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Bookings" subtitle="Manage, reschedule or cancel your appointments." />
      <BookingsTabs
        bookings={bookings.map((b) => ({
          id: b.id,
          status: b.status,
          startsAt: b.startsAt.toISOString(),
          locationType: b.locationType,
          customerTotalKobo: b.customerTotalKobo,
          serviceName: b.service.name,
          serviceImage: publicWellnessPhoto(b.service.imageUrl, PHOTOS.massage),
          vendorName: b.vendor.businessName
        }))}
      />
    </div>
  );
}
