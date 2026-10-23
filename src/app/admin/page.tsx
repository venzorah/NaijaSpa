import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function AdminHome() {
  const [customers, vendors, bookings, payments, audits] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.vendor.groupBy({ by: ["applicationStatus"], _count: true }),
    prisma.booking.findMany(),
    prisma.payment.findMany({ where: { status: "success" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const gross = bookings.reduce((s, b) => s + b.customerTotalKobo, 0);
  const commission = bookings.reduce((s, b) => s + b.commissionKobo, 0);
  const collected = payments.reduce((s, p) => s + p.amountKobo, 0);
  return (
    <div>
      <h1 className="font-display text-3xl">Marketplace health</h1>
      <p className="text-xs text-ink2">Gross booking value is not profit. Recognised platform revenue is commission + configured surcharge share + subscription collections.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Customers" value={String(customers)} />
        <Card label="Vendors" value={String(vendors.reduce((s, v) => s + v._count, 0))} />
        <Card label="Gross bookings" value={formatNgn(gross)} />
        <Card label="Commission revenue" value={formatNgn(commission)} />
        <Card label="Collected (verified payments)" value={formatNgn(collected)} />
        <Card label="Recognised platform revenue" value={formatNgn(commission)} />
      </div>
      <h2 className="mt-8 font-display text-2xl">Recent admin actions</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {audits.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-card p-3">
            {a.action} · {a.entityType} · {a.createdAt.toISOString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-ink2">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
