import { Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn, formatNgnCompact } from "@/lib/money";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";

export default async function Page() {
  const user = await getSession();
  const vendorId = user?.vendorId || "";
  const [rows, payouts] = await Promise.all([
    prisma.vendorEarning.findMany({
      where: { vendorId },
      include: { booking: { select: { id: true, startsAt: true, status: true } } },
      orderBy: { booking: { startsAt: "desc" } },
      take: 80
    }),
    prisma.payout.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const payable = rows.filter((e) => e.status === "pending").reduce((s, e) => s + e.payableKobo, 0);
  const paid = rows.filter((e) => e.status !== "pending").reduce((s, e) => s + e.payableKobo, 0);
  const commission = rows.reduce((s, e) => s + e.commissionKobo, 0);
  return (
    <div>
      <VendorPageHeader title="Earnings & payouts" description="What you keep after commission, and payouts NaijaSpa has sent." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting payout" value={formatNgnCompact(payable)} icon={Wallet} emphasis="gold" />
        <StatCard label="Already paid" value={formatNgnCompact(paid)} />
        <StatCard label="Commission held" value={formatNgnCompact(commission)} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Ledger" className="xl:col-span-2" bodyClassName="p-0">
          {rows.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No earnings yet.</p> : null}
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{formatNgn(e.payableKobo)}</p>
                  <p className="text-xs text-ink2">
                    {e.booking.startsAt.toLocaleDateString("en-NG")} · commission {formatNgn(e.commissionKobo)}
                  </p>
                </div>
                <AdminStatusPill status={e.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Payouts" bodyClassName="p-0">
          {payouts.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No payouts recorded yet.</p> : null}
          <ul className="divide-y divide-line">
            {payouts.map((p) => (
              <li key={p.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{formatNgn(p.amountKobo)}</p>
                <p className="text-xs text-ink2">
                  {p.createdAt.toLocaleDateString("en-NG")} · {p.status}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
