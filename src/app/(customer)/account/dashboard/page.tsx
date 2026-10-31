import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { Bell, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LogoutButton } from "@/components/logout-button";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AccountDashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/dashboard");
  const now = new Date();
  const [upcoming, recent, notes] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: user.id, startsAt: { gte: now }, status: { in: ["confirmed", "in_progress", "awaiting_payment", "pending"] } },
      include: { service: true, vendor: true },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    prisma.booking.findMany({
      where: { customerId: user.id, OR: [{ startsAt: { lt: now } }, { status: { in: ["completed", "cancelled", "refunded"] } }] },
      include: { service: true, vendor: true },
      orderBy: { startsAt: "desc" },
      take: 3
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);
  const next = upcoming[0];
  const first = user.name.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
      <PageHeader
        title={`${greeting()}, ${first}`}
        subtitle="Here’s what’s coming up on your wellness calendar."
        right={<LogoutButton variant="compact" href="/login" />}
      />
      <div className="grid gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-forest p-5 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-gold/30" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3C766]">Next appointment</p>
          {next ? (
            <>
              <h2 className="mt-2 font-display text-3xl font-semibold">{next.service.name}</h2>
              <p className="text-sm text-white/80">
                {next.vendor.businessName} · {next.vendor.city}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">
                  {next.startsAt.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">
                  {next.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">{formatNgn(next.customerTotalKobo)}</span>
              </div>
              <div className="mt-5 flex gap-2">
                <Link href="/account/bookings" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
                  All bookings
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-2 font-display text-3xl font-semibold">Nothing booked yet</h2>
              <p className="text-sm text-white/80">Explore treatments in your city and pay with Paystack.</p>
              <Link href="/explore" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
                Find a treatment
              </Link>
            </>
          )}
        </section>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold">Upcoming</h2>
            <Link href="/account/bookings" className="text-sm font-semibold text-goldink">
              See all
            </Link>
          </div>
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Link href={`/account/bookings/${b.id}`} className="block rounded-3xl border border-line bg-card p-4 hover:border-gold/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{b.service.name}</p>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="text-xs text-ink2">
                    {b.vendor.businessName} · {b.startsAt.toLocaleString("en-NG")} · {formatNgn(b.customerTotalKobo)}
                  </p>
                </Link>
              </li>
            ))}
            {upcoming.length === 0 ? <p className="text-sm text-ink2">No upcoming bookings.</p> : null}
          </ul>
          <h2 className="mb-3 mt-8 font-display text-3xl font-semibold">Recent bookings</h2>
          <ul className="space-y-3">
            {recent.map((b) => (
              <li key={b.id}>
                <Link href={`/account/bookings/${b.id}`} className="block rounded-3xl border border-line bg-card p-4 hover:border-gold/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{b.service.name}</p>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="text-xs text-ink2">{b.vendor.businessName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-display text-3xl font-semibold">Notifications</h2>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-2xl border border-line bg-card p-4">
                <Bell className="mt-0.5 h-5 w-5 text-leaf" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="mt-0.5 text-sm text-ink2">{n.body}</p>
                </div>
              </li>
            ))}
            {notes.length === 0 ? <p className="text-sm text-ink2">No notifications yet.</p> : null}
          </ul>
          <Link href="/ai" className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-left">
            <Sparkles className="h-5 w-5 text-goldink" aria-hidden />
            <span className="text-sm font-semibold text-ink">Not sure what to book next? Ask NaijaSpa AI</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
