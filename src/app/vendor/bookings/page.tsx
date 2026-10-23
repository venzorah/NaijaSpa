import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Page() {
  const user = await getSession();
  const bookings = await prisma.booking.findMany({ where: { vendorId: user?.vendorId || "" }, include: { service: true, customer: true } });
  return (
    <div>
      <h1 className="font-display text-3xl">Bookings</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-xl border border-line bg-card p-3">
            {b.service.name} · {b.customer.name} · {b.status} · {b.locationType}
          </li>
        ))}
      </ul>
    </div>
  );
}
