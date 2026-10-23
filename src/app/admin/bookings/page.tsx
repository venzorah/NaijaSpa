import { prisma } from "@/lib/db";

export default async function Page() {
  const rows = await prisma.booking.findMany({ include: { service: true }, take: 50, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-3xl">Bookings</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((b) => (
          <li key={b.id} className="rounded-xl border border-line bg-card p-3">
            {b.service.name} · {b.status} · {b.planCodeSnapshot}
          </li>
        ))}
      </ul>
    </div>
  );
}
