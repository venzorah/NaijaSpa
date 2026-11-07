import { CalendarCheck2, Star, Users, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCount, formatNgn, formatNgnCompact } from "@/lib/money";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { StatCard } from "@/components/vendor/stat-card";
import { Panel } from "@/components/admin/panel";
import { MiniBars } from "@/components/admin/bar-chart";
export default async function Page() {
    const user = await getSession();
    const vendorId = user?.vendorId || "";
    const monthAgo = new Date(Date.now() - 30 * 864e5);
    const [bookings, earnings, reviews, services] = await Promise.all([
        prisma.booking.findMany({
            where: { vendorId, createdAt: { gte: monthAgo } },
            select: { customerTotalKobo: true, vendorPayableKobo: true, createdAt: true, status: true, serviceId: true, locationType: true }
        }),
        prisma.vendorEarning.findMany({ where: { vendorId } }),
        prisma.review.findMany({ where: { vendorId, status: "published", createdAt: { gte: monthAgo } }, select: { rating: true } }),
        prisma.service.findMany({
            where: { vendorId },
            select: { id: true, name: true, _count: { select: { bookings: true } } },
            orderBy: { createdAt: "desc" }
        })
    ]);
    const payable = earnings.reduce((s, e) => s + e.payableKobo, 0);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const val = bookings.filter((b) => b.createdAt >= d && b.createdAt < next).length;
        return { label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), values: [{ key: "b", value: val, className: "bg-gold/80" }] };
    });
    const top = [...services].sort((a, b) => b._count.bookings - a._count.bookings).slice(0, 6);
    return (<div>
      <VendorPageHeader title="Analytics" description="Bookings, ratings and payable over the last 30 days."/>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bookings (30d)" value={formatCount(bookings.length)} icon={CalendarCheck2}/>
        <StatCard label="Lifetime payable" value={formatNgnCompact(payable)} icon={Wallet} emphasis="gold"/>
        <StatCard label="Avg rating (30d)" value={avg ? avg.toFixed(1) : "—"} icon={Star} sub={`${reviews.length} reviews`}/>
        <StatCard label="Completed (30d)" value={formatCount(bookings.filter((b) => b.status === "completed").length)} icon={Users}/>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Location mix" description="Share of bookings created over the last 30 days.">
          <div className="space-y-5">{["spa", "hotel", "home"].map(location => { const count = bookings.filter(b => b.locationType === location).length; const share = bookings.length ? Math.round(count / bookings.length * 100) : 0; return <div key={location}><div className="mb-2 flex justify-between text-xs"><span className="capitalize">{location === "spa" ? "Spa / Office" : location}</span><span className="text-ink2">{share}% · {count} bookings</span></div><div className="h-2 rounded bg-elev"><div className="h-2 rounded bg-gold" style={{ width: `${share}%` }}/></div></div>; })}</div>
        </Panel>
        <Panel title="Booking outcomes" description="Actual status counts for the last 30 days.">
          <ul className="space-y-3 text-sm">{["awaiting_payment", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map(status => <li key={status} className="flex justify-between"><span className="capitalize text-ink2">{status.replaceAll("_", " ")}</span><span className="font-semibold">{bookings.filter(b => b.status === status).length}</span></li>)}</ul>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Bookings · 14 days" className="xl:col-span-2">
          <MiniBars series={days}/>
        </Panel>
        <Panel title="Top services">
          {top.length === 0 ? <p className="text-sm text-ink2">No services yet.</p> : null}
          <ul className="space-y-2 text-sm">
            {top.map((s) => (<li key={s.id} className="flex justify-between gap-2">
                <span className="truncate">{s.name}</span>
                <span className="tabular-nums text-ink2">{s._count.bookings}</span>
              </li>))}
          </ul>
        </Panel>
      </div>
      <p className="mt-3 text-xs text-ink2">30-day payable {formatNgn(bookings.reduce((s, b) => s + b.vendorPayableKobo, 0))}.</p>
    </div>);
}
