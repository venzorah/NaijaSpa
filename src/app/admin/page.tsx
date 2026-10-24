import Link from "next/link";
import { CalendarCheck, CircleDollarSign, Crown, Store, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function AdminHome() {
  const [customers, vendorGroups, bookings, payments, audits, subscriptions] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.vendor.groupBy({ by: ["applicationStatus"], _count: true }),
    prisma.booking.findMany({ select: { status: true, customerTotalKobo: true, commissionKobo: true } }),
    prisma.payment.findMany({ where: { status: "success" }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
    prisma.vendorSubscription.count({ where: { status: "active" } })
  ]);
  const vendorsTotal = vendorGroups.reduce((s, v) => s + v._count, 0);
  const approved = vendorGroups.find((v) => v.applicationStatus === "approved")?._count ?? 0;
  const pending = vendorGroups.find((v) => v.applicationStatus === "draft" || v.applicationStatus === "submitted")?._count ?? 0;
  const suspended = vendorGroups.find((v) => v.applicationStatus === "suspended")?._count ?? 0;
  const completed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const gross = bookings.reduce((s, b) => s + b.customerTotalKobo, 0);
  const commission = bookings.reduce((s, b) => s + b.commissionKobo, 0);
  const collected = payments.reduce((s, p) => s + p.amountKobo, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Marketplace health</h1>
          <p className="text-sm text-ink2">Gross booking value is not profit. Recognised revenue is commission plus verified collections.</p>
        </div>
        <Link href="/admin/finance" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold">
          Open finance
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={String(customers)} icon={Users} sub="Registered clients" />
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-ink2">
            Vendors <Store className="h-4 w-4" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{vendorsTotal}</p>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
            <span className="rounded bg-forest/10 px-1.5 py-0.5 text-forest tabular-nums">{approved} approved</span>
            <span className="rounded bg-gold/15 px-1.5 py-0.5 text-goldink tabular-nums">{pending} pending</span>
            <span className="rounded bg-elev px-1.5 py-0.5 text-ink2 tabular-nums">{suspended} other</span>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-ink2">
            Bookings <CalendarCheck className="h-4 w-4" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bookings.length}</p>
          <p className="mt-1 text-xs text-ink2">
            {completed} confirmed · {cancelled} cancelled
          </p>
        </div>
        <Stat label="Active subscriptions" value={String(subscriptions)} icon={Crown} sub="Vendor paid plans" emphasis />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Stat label="Gross bookings" value={formatNgn(gross)} icon={CircleDollarSign} sub="Customer totals" />
        <Stat label="Commission" value={formatNgn(commission)} icon={CircleDollarSign} sub="Platform share" emphasis />
        <Stat label="Collected" value={formatNgn(collected)} icon={CircleDollarSign} sub="Verified Paystack only" />
        <Stat label="Recognised revenue" value={formatNgn(commission)} icon={Crown} sub="Commission on confirmed bookings" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-line bg-card xl:col-span-2">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Recent verified payments</h2>
            <p className="text-xs text-ink2">Success rows only</p>
          </div>
          {payments.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink2">No successful payments yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{p.reference}</p>
                    <p className="text-[11px] text-ink2">{p.createdAt.toLocaleString("en-NG")}</p>
                  </div>
                  <p className="tabular-nums font-semibold">{formatNgn(p.amountKobo)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold">Recent admin actions</h2>
          <ol className="mt-3 space-y-3">
            {audits.length === 0 ? <p className="text-sm text-ink2">Nothing audited yet.</p> : null}
            {audits.map((a) => (
              <li key={a.id} className="text-xs">
                <p>
                  <span className="font-medium">{a.actor?.name || "System"}</span>{" "}
                  <span className="text-ink2">{a.action}</span>
                </p>
                <p className="truncate text-ink2">
                  {a.entityType} · {a.createdAt.toLocaleString("en-NG")}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  sub,
  emphasis
}: {
  label: string;
  value: string;
  icon: typeof Users;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`relative rounded-xl border bg-card p-4 ${emphasis ? "border-gold/40" : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink2">{label}</p>
        <Icon className={`h-4 w-4 ${emphasis ? "text-goldink" : "text-ink2"}`} aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub ? <p className="mt-1 truncate text-xs text-ink2">{sub}</p> : null}
    </div>
  );
}
