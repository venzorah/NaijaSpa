import Link from "next/link";
import { Wallet, Clock, CheckCircle2, Percent } from "lucide-react";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { formatNgn, formatNgnCompact } from "@/lib/money";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { StatCard } from "@/components/vendor/stat-card";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { PayoutAccountForm } from "@/components/vendor/payout-account-form";
import { ShopPayoutRequest } from "@/components/vendor/shop-payout-request";
import { activeShopEntitlement } from "@/lib/shop/plans";
import { shopMinPayoutKobo, shopPayoutMode } from "@/lib/shop/ensure";

export default async function VendorShopEarningsPage() {
  const user = await requireVendor();
  const vendorId = user.vendorId;
  const [ledger, settlements, payouts, entitlement, minKobo, mode] = await Promise.all([
    prisma.shopLedgerEntry.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.shopSettlement.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" } }),
    prisma.shopPayout.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 20 }),
    activeShopEntitlement(vendorId),
    shopMinPayoutKobo(),
    shopPayoutMode()
  ]);
  const available = settlements
    .filter((s) => s.status !== "paid" && !s.payoutId && s.availableAt <= new Date())
    .reduce((n, s) => n + s.amountKobo, 0);
  const pending = settlements
    .filter((s) => s.status !== "paid" && s.availableAt > new Date())
    .reduce((n, s) => n + s.amountKobo, 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((n, p) => n + p.amountKobo, 0);

  return (
    <div>
      <VendorPageHeader
        title="Earnings & payouts"
        description="Shop sales after product commission. Shipping is not commissioned. Payouts use the same Nigerian bank account as spa vendors."
        actions={
          <Link href="/vendor/support" className="rounded-lg border border-line px-4 py-2 text-xs font-semibold">
            Payout help
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value={formatNgnCompact(available)} sub="Ready after hold" icon={Clock} emphasis="gold" />
        <StatCard label="Pending hold" value={formatNgnCompact(pending)} sub="Not yet payable" icon={Wallet} />
        <StatCard label="Paid out" value={formatNgnCompact(paid)} sub="Settled Shop payouts" icon={CheckCircle2} />
        <StatCard
          label="Plan commission"
          value={`${((entitlement.commissionBps ?? 0) / 100).toFixed(0)}%`}
          sub={entitlement.planCode || "SHOP_FREE"}
          icon={Percent}
        />
      </div>
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel title="Shop ledger" description="Product sales, refunds and payouts." bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id}>
                    <td className="capitalize">{row.kind.replace(/_/g, " ")}</td>
                    <td className="whitespace-nowrap">{formatNgn(row.amountKobo)}</td>
                    <td className="text-xs text-ink2">{row.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ledger.length ? <p className="p-8 text-center text-sm text-ink2">No Shop ledger entries yet. Paid product orders settle here, not in booking earnings.</p> : null}
        </Panel>
        <div className="space-y-4">
          <Panel title="Request payout">
            <p className="mb-3 text-sm leading-relaxed text-ink2">
              Hold period applies per order. Request sends the available balance to your saved NUBAN through Paystack Transfer.
            </p>
            <ShopPayoutRequest availableKobo={available} minKobo={minKobo} mode={mode} />
          </Panel>
          <Panel title="Payout requests" bodyClassName="p-0">
            {payouts.length ? (
              <ul className="divide-y divide-line">
                {payouts.map((p) => (
                  <li key={p.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{formatNgn(p.amountKobo)}</p>
                      <AdminStatusPill status={p.status} />
                    </div>
                    <p className="mt-2 text-[10px] text-ink2">{p.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</p>
                    {p.note ? <p className="mt-1 break-words text-xs text-ink2">{p.note}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-ink2">No Shop payouts recorded yet.</p>
            )}
          </Panel>
        </div>
      </div>
      <div id="payout-account" className="mt-5 scroll-mt-20">
        <PayoutAccountForm kind="shop" />
      </div>
    </div>
  );
}
