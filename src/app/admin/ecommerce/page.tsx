"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EcommerceOverviewPage() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/shop/overview", { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        const json = (await r.json()) as Record<string, number> & { error?: string };
        if (!r.ok) throw new Error(json.error || "Could not load overview.");
        setData(json);
      })
      .catch(() => setData({}));
    return () => controller.abort();
  }, []);
  const cards = [
    ["Approved sellers", data?.vendors, "/admin/ecommerce/vendors"],
    ["Live products", data?.products, "/admin/ecommerce/products"],
    ["Paid orders", data?.orders, "/admin/ecommerce/orders"],
    ["Vendor applications", data?.pendingVendors, "/admin/ecommerce/vendors"],
    ["Products pending", data?.pendingProducts, "/admin/ecommerce/products"]
  ] as const;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Shop</p>
      <h1 className="mt-1 font-display text-4xl">Ecommerce overview</h1>
      <p className="mt-2 text-sm text-ink2">Product Store only. Service bookings and listing plans stay in Main Admin.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} prefetch={false} className="rounded-[1.5rem] border border-line bg-card p-5 transition hover:border-gold/40">
            <p className="text-sm text-ink2">{label}</p>
            <p className="mt-2 font-display text-3xl">{value ?? "—"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
