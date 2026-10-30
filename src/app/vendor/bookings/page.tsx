import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { VendorBookingsConsole } from "@/components/vendor/bookings-console";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSession();
  const sp = await searchParams;
  const bookings = await prisma.booking.findMany({
    where: { vendorId: user?.vendorId || "" },
    include: { service: true, customer: true, staff: true, payments: { select: { status: true } } },
    orderBy: { startsAt: "desc" },
    take: 200
  });
  return (
    <VendorBookingsConsole
      initialQuery={sp.q ?? ""}
      rows={bookings.map((b) => ({
        id: b.id,
        ref: b.id.slice(-8).toUpperCase(),
        customer: b.customer.name,
        service: b.service.name,
        when: b.startsAt.toLocaleString("en-NG"),
        time: b.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
        location: b.locationType,
        staff: b.staff?.name || "Any",
        payable: b.vendorPayableKobo,
        totalLabel: formatNgn(b.vendorPayableKobo),
        status: b.status,
        payment: b.payments.some((p) => p.status === "success") ? "success" : b.payments[0]?.status ?? "unpaid"
      }))}
    />
  );
}
