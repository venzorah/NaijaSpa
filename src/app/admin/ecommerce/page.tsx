"use client";

import { useEffect, useState } from "react";

export default function EcommerceOverviewPage() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    fetch("/api/admin/shop/overview").then((r) => r.json()).then(setData).catch(() => setData({}));
  }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Ecommerce overview</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Approved sellers", data?.vendors],
          ["Live products", data?.products],
          ["Paid orders", data?.orders],
          ["Vendor applications", data?.pendingVendors],
          ["Products pending", data?.pendingProducts]
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-ink2">{label}</p>
            <p className="mt-2 font-display text-3xl">{value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
