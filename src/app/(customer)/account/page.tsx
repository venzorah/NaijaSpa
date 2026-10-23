import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { LogoutButton } from "@/components/logout-button";

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account");
  const [bookings, notes, membership] = await Promise.all([
    prisma.booking.findMany({ where: { customerId: user.id }, include: { service: true }, orderBy: { startsAt: "desc" }, take: 5 }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.customerMembership.findFirst({ where: { userId: user.id, status: "active" }, include: { plan: true } })
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl">Hello, {user.name}</h1>
      <p className="text-ink2">{user.email}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["/account/bookings", "Bookings"],
          ["/account/favourites", "Favourites"],
          ["/account/membership", "Membership"],
          ["/account/payments", "Payments"],
          ["/account/reviews", "Reviews"],
          ["/account/support", "Support"],
          ["/account/settings", "Settings"]
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-2xl border border-line bg-card p-4 font-semibold">
            {label}
          </Link>
        ))}
      </div>
      <h2 className="mt-8 font-display text-2xl">Upcoming</h2>
      <ul className="mt-3 space-y-2">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-2xl border border-line bg-card p-3 text-sm">
            {b.service.name} · {b.status} · {formatNgn(b.customerTotalKobo)}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-2xl">Notifications</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl border border-line bg-card p-3">
            <p className="font-semibold">{n.title}</p>
            <p className="text-ink2">{n.body}</p>
          </li>
        ))}
      </ul>
      {membership && <p className="mt-6 text-sm">Membership: {membership.plan.name}</p>}
      <LogoutButton />
    </div>
  );
}
