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
    include: { service: true, vendor: true },
    orderBy: { startsAt: "desc" }
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
