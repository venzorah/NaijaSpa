"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";
import { notifyAction } from "@/lib/action-feedback";

type Order = { id: string; number: string; status: string; productKobo: number; shippingKobo: number; tracking: string; items: { nameSnapshot: string; quantity: number }[] };

export function VendorShopOrders({ query = "" }: { query?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? orders.filter(
        (o) =>
          o.number.toLowerCase().includes(needle) ||
          o.status.toLowerCase().includes(needle) ||
          o.items.some((i) => i.nameSnapshot.toLowerCase().includes(needle)) ||
          (o.tracking || "").toLowerCase().includes(needle)
      )
    : orders;
  async function load() {
    const res = await fetch("/api/shop/vendor/orders");
    const data = await res.json();
    setOrders(data.orders ?? []);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  return (
    <ul className="mt-4 space-y-3">
      {!orders.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-ink2">No product orders yet.</li> : null}
      {orders.length && !visible.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-ink2">No orders match “{query.trim()}”.</li> : null}
      {visible.map((o) => (
        <li key={o.id} className="rounded-3xl border border-line bg-card p-4 text-sm">
          <p className="font-semibold">{o.number} · {o.status} · {formatNgn(o.productKobo)} + ship {formatNgn(o.shippingKobo)}</p>
          {o.items.map((i) => <p key={i.nameSnapshot}>{i.nameSnapshot} × {i.quantity}</p>)}
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBusyId(o.id);
              setError("");
              try {
                const res = await fetch("/api/shop/vendor/orders", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: o.id, status: fd.get("status"), tracking: fd.get("tracking") })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not update order.");
                notifyAction("success", "Order updated.");
                await load();
              } catch (err) {
                const text = err instanceof Error ? err.message : "Could not update order.";
                setError(text);
                notifyAction("error", text);
              } finally {
                setBusyId("");
              }
            }}
          >
            <select name="status" defaultValue={o.status} className="h-9 rounded-xl border border-line px-2">
              {["confirmed", "processing", "dispatched", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input name="tracking" defaultValue={o.tracking} placeholder="Tracking" className="h-9 rounded-xl border border-line px-2" />
            <button disabled={busyId === o.id} className="h-9 rounded-full bg-gold px-3 text-xs font-bold text-ongold disabled:opacity-60">
              {busyId === o.id ? "Saving…" : "Update"}
            </button>
          </form>
        </li>
      ))}
      {error ? <li role="alert" className="text-sm text-red-600">{error}</li> : null}
    </ul>
  );
}
