"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";

type Tab = "transactions" | "refunds" | "earnings" | "payouts";

export function FinanceConsole({
  payments,
  refunds,
  earnings,
  payouts,
  editable
}: {
  payments: { id: string; reference: string; purpose: string; status: string; amountKobo: number; createdAt: string }[];
  refunds: { id: string; amountKobo: number; status: string; reason: string | null; createdAt: string }[];
  earnings: { id: string; vendor: string; payableKobo: number; commissionKobo: number; status: string }[];
  payouts: { id: string; vendor: string; amountKobo: number; status: string; note: string | null; createdAt: string }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("transactions");
  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "refunds", label: "Refunds" },
    { id: "earnings", label: "Vendor earnings" },
    { id: "payouts", label: "Payouts" }
  ];
  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-elev p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === t.id ? "bg-card ring-1 ring-gold/30" : "text-ink2")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "transactions" ? (
        <Panel title="Payments" description="Paystack rows including initialized" bodyClassName="p-0">
          <Rows
            items={payments.map((p) => ({
              id: p.id,
              title: p.reference,
              sub: `${p.purpose} · ${p.createdAt}`,
              amount: p.amountKobo,
              status: p.status
            }))}
          />
        </Panel>
      ) : null}
      {tab === "refunds" ? (
        <Panel title="Refunds" bodyClassName="p-0">
          <Rows
            items={refunds.map((r) => ({
              id: r.id,
              title: r.reason || "Refund",
              sub: r.createdAt,
              amount: r.amountKobo,
              status: r.status
            }))}
          />
        </Panel>
      ) : null}
      {tab === "earnings" ? (
        <Panel title="Vendor earnings" bodyClassName="p-0">
          <Rows
            items={earnings.map((e) => ({
              id: e.id,
              title: e.vendor,
              sub: `Commission ${formatNgn(e.commissionKobo)}`,
              amount: e.payableKobo,
              status: e.status
            }))}
          />
        </Panel>
      ) : null}
      {tab === "payouts" ? (
        <Panel title="Payouts">
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{p.vendor}</p>
                  <p className="text-[11px] text-ink2">
                    {p.createdAt} {p.note ? `· ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold">{formatNgn(p.amountKobo)}</span>
                  <AdminStatusPill status={p.status} />
                  {p.status === "pending" ? (
                    <ConfirmAction
                      triggerLabel="Mark paid"
                      triggerVariant="default"
                      disabled={!editable}
                      title="Release this payout?"
                      description="Marks the payout as paid. Use this after the bank transfer has gone out."
                      confirmLabel="Mark paid"
                      onConfirm={async () => {
                        await adminJson(`/api/admin/payouts/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: "paid" }) });
                        router.refresh();
                      }}
                    />
                  ) : null}
                  {["failed", "needs_account", "pending", "otp"].includes(p.status) ? (
                    <ConfirmAction
                      triggerLabel="Retry transfer"
                      triggerVariant="outline"
                      disabled={!editable}
                      title="Retry Paystack transfer?"
                      description="Sends this earning again to the vendor’s saved bank account."
                      confirmLabel="Retry"
                      onConfirm={async () => {
                        await adminJson(`/api/admin/payouts/${p.id}`, { method: "PATCH", body: JSON.stringify({ retry: true }) });
                        router.refresh();
                      }}
                    />
                  ) : null}
                </div>
              </li>
            ))}
            {payouts.length === 0 ? <p className="text-sm text-ink2">No payouts yet.</p> : null}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Rows({ items }: { items: { id: string; title: string; sub: string; amount: number; status: string }[] }) {
  if (!items.length) return <p className="px-4 py-8 text-sm text-ink2">Nothing in this ledger yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">{item.title}</p>
            <p className="text-[11px] text-ink2">{item.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-semibold">{formatNgn(item.amount)}</span>
            <AdminStatusPill status={item.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
