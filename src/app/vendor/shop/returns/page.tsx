"use client";

import { useEffect, useState } from "react";

export default function VendorShopReturnsPage() {
  const [rows, setRows] = useState<{ id: string; reason: string; status: string; vendorOrder: { number: string } }[]>([]);
  useEffect(() => {
    fetch("/api/shop/vendor/returns").then((r) => r.json()).then((d) => setRows(d.returns ?? [])).catch(() => undefined);
  }, []);
  return (
    <div>
      <h1 className="font-display text-2xl">Returns</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-line bg-card p-4">{r.vendorOrder.number} · {r.status}<p>{r.reason}</p></li>
        ))}
      </ul>
    </div>
  );
}
