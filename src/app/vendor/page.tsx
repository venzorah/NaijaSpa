import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, Crown, Gauge, Lock, MessageCircle, Phone, Star, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { formatCount, formatNgn, formatNgnCompact } from "@/lib/money";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { StatCard } from "@/components/admin/stat-card";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { MiniBars } from "@/components/admin/bar-chart";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function VendorHome() {
  const user = await getSession();
  const vendorId = user?.vendorId;
  if (!vendorId) return <p>No vendor profile.</p>;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [vendor, bookings, weekBookings, earnings, pendingBookings, hiddenServices, docs] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } }),
    prisma.booking.findMany({
      where: { vendorId, startsAt: { gte: start } },
      include: { service: true, staff: true, customer: true },
      orderBy: { startsAt: "asc" },
      take: 12
    }),
    prisma.booking.findMany({
      where: { vendorId, createdAt: { gte: weekAgo } },
      select: { customerTotalKobo: true, vendorPayableKobo: true, createdAt: true, commissionKobo: true }
    }),
    prisma.vendorEarning.findMany({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId, status: { in: ["awaiting_payment", "pending", "cancellation_requested"] } } }),
    prisma.service.count({ where: { vendorId, active: false } }),
    prisma.verificationDoc.findMany({ where: { vendorId } })
  ]);
  const ent = await vendorEntitlement(vendorId);
  const payable = earnings.reduce((s, e) => s + e.payableKobo, 0);
  const weekPayable = weekBookings.reduce((s, b) => s + b.vendorPayableKobo, 0);
  const firstName = user?.name.split(" ")[0] || "there";
  const paid = ent.activePaid;
  const later = Math.max(0, bookings.length - 8);
  const shown = bookings.slice(0, 8);
  const slots = await prisma.availabilitySlot.findMany({ where: { vendorId } });
  const todayWeekday = start.getDay();
  const hoursToday = slots.filter((s) => s.weekday === todayWeekday).reduce((s, sl) => s + Math.max(0, sl.endMin - sl.startMin), 0) / 60;
  const occupancy = hoursToday > 0 ? Math.min(100, Math.round((bookings.length * 1.2 / hoursToday) * 100)) : bookings.length ? 100 : 0;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const val = weekBookings.filter((b) => b.createdAt >= d && b.createdAt < next).reduce((s, b) => s + b.vendorPayableKobo, 0);
    return { label: d.toLocaleDateString("en-NG", { weekday: "short" }), values: [{ key: "p", value: val, className: "bg-gold/80" }] };
  });

  return (
    <div>
      <VendorPageHeader
        eyebrow={start.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting()}, ${firstName}`}
        description={`Here’s what’s happening at ${vendor.businessName} today.`}
        actions={
          <>
            <Link href="/vendor/availability" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold">
              Block time
            </Link>
            <Link href="/vendor/bookings" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-gold px-4 text-sm font-bold text-ongold">
              View bookings <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/vendor/bookings" label="Today’s bookings" value={formatCount(bookings.length)} icon={CalendarCheck2} sub="On the calendar from midnight" />
        <StatCard href="/vendor/availability" label="Occupancy today" value={`${occupancy}%`} icon={Gauge} sub={hoursToday ? `${hoursToday.toFixed(0)} therapist-hours on the roster` : "Add availability to measure occupancy"} />
        <StatCard href="/vendor/earnings" label="Payable this week" value={formatNgnCompact(weekPayable)} icon={Wallet} sub={paid ? "0% commission" : `after ${ent.commissionBps / 100}% commission`} emphasis="gold" />
        <StatCard label="Rating" value={vendor.ratingAvg.toFixed(1)} icon={Star} sub={`${vendor.reviewCount} reviews`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Today’s schedule" description={`${bookings.length} appointments`} className="xl:col-span-2" bodyClassName="p-0" actions={<Link href="/vendor/bookings" className="text-sm font-semibold text-goldink">Open inbox</Link>}>
          {shown.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink2">No bookings starting today yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-16 shrink-0">
                    <p className="font-mono text-sm font-medium">{b.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-[11px] text-ink2">{b.service.durationMin} min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.service.name}</p>
                    <p className="truncate text-xs text-ink2">
                      {b.customer.name} · {b.staff?.name || "Any therapist"} · {b.locationType}
                    </p>
                  </div>
                  <AdminStatusPill status={b.status} />
                </li>
              ))}
              {later > 0 ? <li className="px-5 py-3 text-sm text-ink2">+{later} more later today</li> : null}
            </ul>
          )}
        </Panel>
        <Panel title="Needs your attention">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-2">
              <span>Bookings waiting</span>
              <Link href="/vendor/bookings" className="font-semibold text-goldink">{pendingBookings}</Link>
            </li>
            <li className="flex justify-between gap-2">
              <span>Hidden services</span>
              <Link href="/vendor/services" className="font-semibold text-goldink">{hiddenServices}</Link>
            </li>
            <li className="flex justify-between gap-2">
              <span>Application</span>
              <Link href="/vendor/profile" className="capitalize text-goldink">{vendor.applicationStatus.replace(/_/g, " ")}</Link>
            </li>
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Earnings · last 7 days" description="Vendor payable after commission" className="xl:col-span-2" actions={<p className="font-display text-2xl tabular-nums">{formatNgn(weekPayable)}</p>}>
          <MiniBars series={days} />
        </Panel>
        <div className="grid gap-4">
          <Panel>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Subscription</p>
              <AdminStatusPill status={paid ? "Active" : "Free"} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-goldink">
                <Crown className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{paid ? `${ent.planCode} plan` : "Free plan"}</p>
                <p className="text-xs text-ink2">{paid ? "0% commission while active" : "10% commission on each booking"}</p>
              </div>
            </div>
            <Link href="/vendor/subscriptions" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold">
              {paid ? "Manage subscription" : "Compare paid plans"}
            </Link>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Verification</p>
              <AdminStatusPill status={vendor.verificationStatus} />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink2">
              {docs.length === 0 ? <li>No documents uploaded yet.</li> : null}
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-forest" aria-hidden />
                  {d.kind} · {d.status}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Public contact</p>
              <AdminStatusPill status={ent.publicDirectContact ? "Visible" : "Hidden"} />
            </div>
            <div className="mt-3 space-y-2">
              {[
                { icon: Phone, label: "Phone", value: vendor.privatePhone },
                { icon: MessageCircle, label: "WhatsApp", value: vendor.privateWhatsapp }
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-lg bg-elev px-3 py-2">
                  <c.icon className="h-4 w-4 text-ink2" aria-hidden />
                  <span className="text-xs text-ink2">{c.label}</span>
                  <span className="ml-auto font-mono text-xs">{ent.publicDirectContact ? c.value || "Not set" : "+234 ••• ••• ••••"}</span>
                  {!ent.publicDirectContact ? <Lock className="h-3.5 w-3.5 text-ink2" aria-hidden /> : null}
                </div>
              ))}
            </div>
            {!paid ? (
              <Link href="/vendor/subscriptions" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold">
                Unlock public contact
              </Link>
            ) : null}
          </Panel>
        </div>
      </div>
      <p className="sr-only">Lifetime payable {formatNgn(payable)}</p>
    </div>
  );
}
