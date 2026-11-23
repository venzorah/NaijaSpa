"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";

export default function VendorShopEarningsPage() {
  const [data, setData] = useState<{ available: number; pending: number; ledger: { id: string; kind: string; amountKobo: number }[]; entitlement: { planCode: string; commissionBps: number } } | null>(null);
  useEffect(() => {
    fetch("/api/shop/vendor/earnings").then((r) => r.json()).then(setData).catch(() => undefined);
  }, []);
  if (!data) return <p className="text-sm text-ink2">Loading Shop earnings…</p>;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Money</p>
      <h1 className="mt-1 font-display text-3xl">Shop earnings</h1>
      <p className="mt-2 text-sm text-ink2">Plan {data.entitlement?.planCode} · commission {((data.entitlement?.commissionBps ?? 0) / 100).toFixed(0)}% on products, not shipping.</p>
      <p className="mt-4">Available {formatNgn(data.available ?? 0)} · Pending {formatNgn(data.pending ?? 0)}</p>
      <ul className="mt-4 space-y-1 text-sm">
        {(data.ledger ?? []).map((row) => (
          <li key={row.id} className="rounded-2xl border border-line bg-card px-4 py-3">{row.kind} · {formatNgn(row.amountKobo)}</li>
        ))}
        {!(data.ledger ?? []).length ? <li className="text-ink2">No ledger entries yet. Paid product orders settle here, not in booking earnings.</li> : null}
      </ul>
    </div>
  );
}
