"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";

type Order = { id: string; number: string; status: string; productKobo: number; shippingKobo: number; tracking: string; items: { nameSnapshot: string; quantity: number }[] };

export function VendorShopOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    fetch("/api/shop/vendor/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? [])).catch(() => undefined);
  }, []);
  return (
    <ul className="mt-4 space-y-3">
      {!orders.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-ink2">No product orders yet.</li> : null}
      {orders.map((o) => (
        <li key={o.id} className="rounded-3xl border border-line bg-card p-4 text-sm">
          <p className="font-semibold">{o.number} · {o.status} · {formatNgn(o.productKobo)} + ship {formatNgn(o.shippingKobo)}</p>
          {o.items.map((i) => <p key={i.nameSnapshot}>{i.nameSnapshot} × {i.quantity}</p>)}
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await fetch("/api/shop/vendor/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, status: fd.get("status"), tracking: fd.get("tracking") }) });
              location.reload();
            }}
          >
            <select name="status" defaultValue={o.status} className="h-9 rounded-xl border border-line px-2">
              {["confirmed", "processing", "dispatched", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input name="tracking" defaultValue={o.tracking} placeholder="Tracking" className="h-9 rounded-xl border border-line px-2" />
            <button className="h-9 rounded-full bg-gold px-3 text-xs font-bold text-ongold">Update</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
