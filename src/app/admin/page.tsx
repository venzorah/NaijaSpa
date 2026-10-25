import Link from "next/link";
import { CalendarCheck, CircleDollarSign, Crown, Lock, Megaphone, Store, Users } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatCount, formatNgn, formatNgnCompact } from "@/lib/money";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { StatCard } from "@/components/admin/stat-card";
import { MoneyFlow } from "@/components/admin/money-flow";
import { MiniBars } from "@/components/admin/bar-chart";
import { PersonAvatar } from "@/components/admin/avatar";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/empty-state";
import { DashboardRange } from "@/components/admin/dashboard-range";

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { user } = await requireAdminScreen("dashboard");
  const sp = await searchParams;
  const range = sp.range === "7d" || sp.range === "90d" ? sp.range : "30d";
  const since = new Date(Date.now() - RANGES[range] * 864e5);
  const canSeeMoney = hasPermission(user.role, "finance.view");
  const canSeeCampaigns = hasPermission(user.role, "campaigns.manage") || hasPermission(user.role, "analytics.view");
  const canSeeAudit = hasPermission(user.role, "audit.view");

  const [customers, vendorGroups, bookings, payments, audits, subscriptions, campaigns, memberships, refunds, payouts] =
    await Promise.all([
      prisma.user.findMany({ where: { role: "customer" }, select: { createdAt: true, status: true } }),
      prisma.vendor.groupBy({ by: ["applicationStatus"], _count: true }),
      prisma.booking.findMany({ select: { status: true, customerTotalKobo: true, commissionKobo: true, createdAt: true } }),
      prisma.payment.findMany({ where: { status: "success" }, orderBy: { createdAt: "desc" }, take: 80 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
      prisma.vendorSubscription.count({ where: { status: "active" } }),
      prisma.campaign.findMany({ include: { vendor: { select: { businessName: true } } }, take: 8 }),
      prisma.payment.aggregate({ where: { status: "success", purpose: "membership", createdAt: { gte: since } }, _sum: { amountKobo: true } }),
      prisma.refund.aggregate({ where: { createdAt: { gte: since } }, _sum: { amountKobo: true } }),
      prisma.payout.aggregate({ where: { createdAt: { gte: since } }, _sum: { amountKobo: true } })
    ]);

  const periodBookings = bookings.filter((b) => b.createdAt >= since);
  const periodPayments = payments.filter((p) => p.createdAt >= since);
  const vendorsTotal = vendorGroups.reduce((s, v) => s + v._count, 0);
  const approved = vendorGroups.find((v) => v.applicationStatus === "approved")?._count ?? 0;
  const pending = vendorGroups.filter((v) => ["draft", "submitted", "under_review"].includes(v.applicationStatus)).reduce((s, v) => s + v._count, 0);
  const suspended = vendorGroups.find((v) => v.applicationStatus === "suspended")?._count ?? 0;
  const completed = periodBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const cancelled = periodBookings.filter((b) => b.status === "cancelled").length;
  const gbv = periodBookings.reduce((s, b) => s + b.customerTotalKobo, 0);
  const commission = periodBookings.reduce((s, b) => s + b.commissionKobo, 0);
  const collected = periodPayments.filter((p) => p.purpose === "booking").reduce((s, p) => s + p.amountKobo, 0);
  const subscriptionRevenue = periodPayments.filter((p) => p.purpose === "subscription").reduce((s, p) => s + p.amountKobo, 0);
  const membershipRevenue = memberships._sum.amountKobo ?? 0;
  const sponsoredRevenue = 0;
  const refundsKobo = refunds._sum.amountKobo ?? 0;
  const payoutsKobo = payouts._sum.amountKobo ?? 0;
  const completionRate = periodBookings.length ? (completed / periodBookings.length) * 100 : 0;

  const months: { label: string; gbv: number; collected: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 1);
    const label = d.toLocaleString("en-NG", { month: "short" });
    const g = bookings.filter((b) => b.createdAt >= d && b.createdAt < end).reduce((s, b) => s + b.customerTotalKobo, 0);
    const c = payments.filter((p) => p.createdAt >= d && p.createdAt < end && p.purpose === "booking").reduce((s, p) => s + p.amountKobo, 0);
    const r = bookings.filter((b) => b.createdAt >= d && b.createdAt < end).reduce((s, b) => s + b.commissionKobo, 0);
    months.push({ label, gbv: g, collected: c, revenue: r });
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const done = bookings.filter((b) => b.createdAt >= d && b.createdAt < next && (b.status === "completed" || b.status === "confirmed")).length;
    const canx = bookings.filter((b) => b.createdAt >= d && b.createdAt < next && b.status === "cancelled").length;
    return { label: d.toLocaleDateString("en-NG", { weekday: "short" }), values: [{ key: "done", value: done, className: "bg-forest/70" }, { key: "canx", value: canx, className: "bg-red-400/70" }] };
  });

  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const ctr = impressions ? (clicks / impressions) * 100 : 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        screen="dashboard"
        actions={
          <>
            <DashboardRange value={range} />
            <Link href="/admin/finance" className="inline-flex min-h-9 items-center rounded-full border border-line px-4 text-xs font-semibold">
              Open finance
            </Link>
          </>
        }
      />

      <section aria-labelledby="marketplace-kpis" className="space-y-2">
        <h2 id="marketplace-kpis" className="sr-only">
          Marketplace activity
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            href="/admin/users"
            label="Customers"
            value={formatCount(customers.length)}
            sub={`${formatCount(customers.filter((c) => c.status === "active").length)} active`}
            icon={Users}
          />
          <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
            <Link href="/admin/vendors" className="flex items-center justify-between text-xs font-medium text-ink2 transition hover:text-goldink">
              Vendors <Store className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/admin/vendors" className="mt-2 block text-2xl font-semibold tabular-nums tracking-tight">
              {formatCount(vendorsTotal)}
            </Link>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
              <Link href="/admin/vendors" className="rounded bg-forest/10 px-1.5 py-0.5 text-forest tabular-nums hover:bg-forest/20">
                {formatCount(approved)} approved
              </Link>
              <Link href="/admin/applications" className="rounded bg-gold/15 px-1.5 py-0.5 text-goldink tabular-nums hover:bg-gold/25">
                {pending} pending
              </Link>
              <Link href="/admin/vendors" className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-700 tabular-nums hover:bg-red-500/20 dark:text-red-300">
                {suspended} suspended
              </Link>
            </div>
          </div>
          <Link href="/admin/bookings" className="rounded-xl border border-line bg-card p-4 shadow-sm transition hover:border-gold/50">
            <div className="flex items-center justify-between text-xs font-medium text-ink2">
              Bookings <CalendarCheck className="h-4 w-4" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatCount(periodBookings.length)}</p>
            <p className="mt-1 text-xs text-ink2 tabular-nums">
              <span className="text-forest">{formatCount(completed)} completed</span> · <span className="text-red-600 dark:text-red-300">{formatCount(cancelled)} cancelled</span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink2">{completionRate.toFixed(0)}% completion rate</p>
          </Link>
          <StatCard href="/admin/commercial" label="Active vendor subscriptions" value={formatCount(subscriptions)} sub="Weekly · Monthly · 6-Month" icon={Crown} emphasis="gold" />
        </div>
      </section>

      {canSeeMoney ? (
        <>
          <Panel title="Money flow" description="How booking activity becomes platform revenue. Gross booking value is never profit.">
            <MoneyFlow
              gbv={gbv}
              collected={collected}
              commission={commission}
              refunds={refundsKobo}
              subscriptionRevenue={subscriptionRevenue}
              membershipRevenue={membershipRevenue}
              sponsoredRevenue={sponsoredRevenue}
            />
          </Panel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Commission revenue" value={formatNgnCompact(commission)} icon={CircleDollarSign} emphasis="gold" definition="Commission earned on bookings in this range." />
            <StatCard label="Subscription revenue" value={formatNgnCompact(subscriptionRevenue)} icon={Crown} definition="Verified vendor plan payments." />
            <StatCard label="Membership revenue" value={formatNgnCompact(membershipRevenue)} icon={Users} definition="Verified customer membership payments." />
            <StatCard label="Sponsored revenue" value={formatNgnCompact(sponsoredRevenue)} icon={Megaphone} definition="Campaign fees are not billed as a separate payment purpose yet." />
            <StatCard label="Refunds issued" value={formatNgnCompact(refundsKobo)} icon={CircleDollarSign} />
            <StatCard label="Vendor payouts" value={formatNgnCompact(payoutsKobo)} icon={CircleDollarSign} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="GBV vs collected vs revenue" description="Last 6 months" className="xl:col-span-2">
              <MiniBars
                series={months.map((m) => ({
                  label: m.label,
                  values: [
                    { key: "gbv", value: m.gbv, className: "bg-ink2/40" },
                    { key: "collected", value: m.collected, className: "bg-forest/70" },
                    { key: "revenue", value: m.revenue, className: "bg-gold/80" }
                  ]
                }))}
              />
            </Panel>
            <Panel title="Revenue mix" description="Recognised platform revenue · this range">
              {[
                { label: "Commission", value: commission },
                { label: "Subscriptions", value: subscriptionRevenue },
                { label: "Memberships", value: membershipRevenue }
              ].map((row) => {
                const total = commission + subscriptionRevenue + membershipRevenue || 1;
                return (
                  <div key={row.label} className="mb-3">
                    <div className="flex justify-between text-xs">
                      <span>{row.label}</span>
                      <span className="tabular-nums">{formatNgn(row.value)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-elev">
                      <div className="h-2 rounded-full bg-gold" style={{ width: `${(row.value / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </Panel>
          </div>
        </>
      ) : (
        <Panel title="Financial metrics">
          <EmptyState icon={Lock} title="Restricted to finance roles" text="Gross booking value, collected funds, revenue and payouts are visible to Finance officers, Super administrators and analysts." />
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Bookings this week" description="Confirmed vs cancelled">
          <MiniBars series={weekDays} />
        </Panel>
        {canSeeCampaigns ? (
          <Panel title="Sponsored campaign performance" description={`${campaigns.filter((c) => c.active).length} live campaigns`} className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Impressions", value: formatCount(impressions) },
                { label: "Clicks", value: formatCount(clicks) },
                { label: "CTR", value: `${ctr.toFixed(2)}%` },
                { label: "Live", value: formatCount(campaigns.filter((c) => c.active).length) }
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-line bg-bg/40 p-3">
                  <p className="text-[11px] text-ink2">{m.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {campaigns.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <AdminStatusPill status={c.active ? "Live" : "Paused"} tone="gold" dot={false} />
                    <span className="truncate font-medium">{c.placement}</span>
                    <span className="hidden truncate text-ink2 sm:inline">· {c.vendor.businessName}</span>
                  </div>
                  <span className="tabular-nums text-ink2">{c.impressions} imps</span>
                </div>
              ))}
              {campaigns.length === 0 ? <p className="text-xs text-ink2">No campaigns yet.</p> : null}
            </div>
          </Panel>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {canSeeMoney ? (
          <Panel title="Recent transactions" description="Verified Paystack only" className="xl:col-span-2" bodyClassName="p-0">
            {periodPayments.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink2">No successful payments in this range.</p>
            ) : (
              <ul className="divide-y divide-line">
                {periodPayments.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{p.reference}</p>
                      <p className="text-[11px] text-ink2">
                        {p.purpose} · {p.createdAt.toLocaleString("en-NG")}
                      </p>
                    </div>
                    <p className="tabular-nums font-semibold">{formatNgn(p.amountKobo)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
        {canSeeAudit ? (
          <Panel title="Recent admin actions" description="From the audit log" className={canSeeMoney ? "" : "xl:col-span-3"}>
            <ol className="space-y-3">
              {audits.length === 0 ? <p className="text-sm text-ink2">Nothing audited yet.</p> : null}
              {audits.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <PersonAvatar name={a.actor?.name || "System"} />
                  <div className="min-w-0 text-xs">
                    <p>
                      <span className="font-medium">{a.actor?.name || "System"}</span> <span className="text-ink2">{a.action}</span>
                    </p>
                    <p className="truncate text-ink2">
                      {a.entityType} · {a.createdAt.toLocaleString("en-NG")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
