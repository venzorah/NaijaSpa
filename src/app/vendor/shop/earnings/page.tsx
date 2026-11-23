"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";

export default function VendorShopEarningsPage() {
  const [data, setData] = useState<{ available: number; pending: number; ledger: { id: string; kind: string; amountKobo: number }[]; entitlement: { planCode: string; commissionBps: number } } | null>(null);
  useEffect(() => {
    fetch("/api/shop/vendor/earnings").then((r) => r.json()).then(setData).catch(() => undefined);
  }, []);
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-2xl">Shop earnings</h1>
      <p className="mt-2 text-sm text-ink2">Plan {data.entitlement?.planCode} · commission {((data.entitlement?.commissionBps ?? 0) / 100).toFixed(0)}% on products, not shipping.</p>
      <p className="mt-4">Available {formatNgn(data.available ?? 0)} · Pending {formatNgn(data.pending ?? 0)}</p>
      <ul className="mt-4 space-y-1 text-sm">
        {(data.ledger ?? []).map((row) => (
          <li key={row.id}>{row.kind} · {formatNgn(row.amountKobo)}</li>
        ))}
      </ul>
    </div>
  );
}
