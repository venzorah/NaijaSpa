import { CalendarClock, Gavel, MapPin, UserX } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { bookingBucket } from "@/lib/admin";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatCount } from "@/lib/money";
import { bookingReference, displayNgPhone, isGuestAccountKind } from "@/lib/phone";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { BookingsConsole } from "@/components/admin/bookings-console";

export default async function Page() {
  const { user, editable } = await requireAdminScreen("bookings");
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const [rows, upcomingToday, inProgress, disputed, noShows] = await Promise.all([
    prisma.booking.findMany({
      select: {
        id: true,
        status: true,
        startsAt: true,
        locationType: true,
        customerNotes: true,
        customerTotalKobo: true,
        basePriceKobo: true,
        surchargeKobo: true,
        commissionKobo: true,
        vendorPayableKobo: true,
        service: { select: { name: true } },
        customer: { select: { name: true, phone: true, phoneNormalized: true, accountKind: true } },
        vendor: { select: { businessName: true } },
        payments: { select: { status: true }, take: 3, orderBy: { createdAt: "desc" } }
      },
      take: 120,
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.count({ where: { startsAt: { gte: startToday }, status: { in: ["confirmed", "awaiting_payment"] } } }),
    prisma.booking.count({ where: { OR: [{ status: "in_progress" }, { status: "confirmed", startsAt: { lte: now } }] } }),
    prisma.booking.count({ where: { status: "disputed" } }),
    prisma.booking.count({ where: { status: "no_show" } })
  ]);
  return (
    <div>
      <AdminPageHeader screen="bookings" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming today" value={formatCount(upcomingToday)} icon={CalendarClock} />
        <StatCard label="In progress" value={formatCount(inProgress)} icon={MapPin} />
        <StatCard label="Open disputes" value={formatCount(disputed)} icon={Gavel} emphasis="gold" />
        <StatCard label="No-shows" value={formatCount(noShows)} icon={UserX} />
      </div>
      <BookingsConsole
        editable={editable}
        canSeeMoney={hasPermission(user, "finance.view") || editable}
        rows={rows.map((b) => ({
          id: b.id,
          ref: bookingReference(b.id),
          customer: b.customer.name,
          customerKind: isGuestAccountKind(b.customer.accountKind) ? "guest" : "registered",
          phone: b.customer.phone || (b.customer.phoneNormalized ? displayNgPhone(b.customer.phoneNormalized) : ""),
          notes: b.customerNotes,
          vendor: b.vendor.businessName,
          service: b.service.name,
          when: b.startsAt.toLocaleString("en-NG"),
          location: b.locationType,
          total: b.customerTotalKobo,
          base: b.basePriceKobo,
          surcharge: b.surchargeKobo,
          commission: b.commissionKobo,
          vendorPayable: b.vendorPayableKobo,
          payment: b.payments[0]?.status ?? "unpaid",
          status: b.status,
          bucket: bookingBucket(b.status, b.startsAt, now)
        }))}
      />
    </div>
  );
}
