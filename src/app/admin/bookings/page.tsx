import { CalendarClock, Gavel, MapPin, UserX } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { bookingBucket } from "@/lib/admin";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatCount } from "@/lib/money";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { BookingsConsole } from "@/components/admin/bookings-console";

export default async function Page() {
  const { user, editable } = await requireAdminScreen("bookings");
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const rows = await prisma.booking.findMany({
    include: {
      service: true,
      customer: { select: { name: true } },
      vendor: { select: { businessName: true } },
      payments: { select: { status: true } }
    },
    take: 120,
    orderBy: { createdAt: "desc" }
  });
  const upcomingToday = rows.filter((b) => b.startsAt >= startToday && ["confirmed", "awaiting_payment"].includes(b.status)).length;
  const inProgress = rows.filter((b) => bookingBucket(b.status, b.startsAt, now) === "In progress").length;
  const disputed = rows.filter((b) => b.status === "disputed").length;
  const noShows = rows.filter((b) => b.status === "no_show").length;
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
        canSeeMoney={hasPermission(user.role, "finance.view") || editable}
        rows={rows.map((b) => ({
          id: b.id,
          ref: b.id.slice(-8).toUpperCase(),
          customer: b.customer.name,
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
