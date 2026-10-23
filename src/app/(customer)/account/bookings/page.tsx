import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function BookingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/bookings");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: { service: true, vendor: true, payments: true },
    orderBy: { startsAt: "desc" }
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl">Bookings</h1>
      <ul className="mt-4 space-y-3">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{b.service.name}</p>
            <p className="text-xs text-ink2">
              {b.vendor.businessName} · {b.status} · {b.locationType} · {formatNgn(b.customerTotalKobo)}
            </p>
            <p className="mt-2 text-xs">
              Snapshot: {b.planCodeSnapshot} · commission {b.commissionBps / 100}% = {formatNgn(b.commissionKobo)} · surcharge {formatNgn(b.surchargeKobo)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
