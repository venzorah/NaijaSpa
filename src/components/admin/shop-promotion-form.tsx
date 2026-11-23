"use client";

import { useEffect, useState } from "react";

type Promo = { id: string; label: string; kind: string; active: boolean };

export function ShopPromotionManager() {
  const [promotions, setPromotions] = useState<Promo[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const res = await fetch("/api/admin/shop/promotions");
    const data = await res.json();
    setPromotions(data.promotions ?? []);
  }
  useEffect(() => {
    load().catch(() => setPromotions([]));
  }, []);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form
        className="grid gap-2 rounded-[1.5rem] border border-line bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/admin/shop/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: fd.get("kind"),
              label: fd.get("label"),
              productId: fd.get("productId") || undefined,
              vendorId: fd.get("vendorId") || undefined,
              startsAt: fd.get("startsAt"),
              endsAt: fd.get("endsAt"),
              active: true
            })
          });
          setMessage(res.ok ? "Promotion saved." : "Could not save");
          if (res.ok) await load();
        }}
      >
        <p className="font-semibold">New promotion</p>
        <input required name="label" placeholder="Label" className="h-11 rounded-2xl border border-line px-3" />
        <select name="kind" className="h-11 rounded-2xl border border-line px-3">
          <option value="featured_product">Featured product</option>
          <option value="sponsored_product">Sponsored product</option>
          <option value="featured_vendor">Featured vendor</option>
        </select>
        <input name="productId" placeholder="Product id (optional)" className="h-11 rounded-2xl border border-line px-3" />
        <input name="vendorId" placeholder="Vendor id (optional)" className="h-11 rounded-2xl border border-line px-3" />
        <label className="text-sm">Starts<input required type="datetime-local" name="startsAt" className="ml-2 h-11 rounded-2xl border border-line px-3" /></label>
        <label className="text-sm">Ends<input required type="datetime-local" name="endsAt" className="ml-2 h-11 rounded-2xl border border-line px-3" /></label>
        <button className="h-11 rounded-full bg-gold text-sm font-bold text-ongold">Create</button>
        {message ? <p className="text-sm text-goldink">{message}</p> : null}
      </form>
      <ul className="space-y-2 text-sm">
        {promotions.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            {p.label} · {p.kind} · {p.active ? "on" : "off"}
          </li>
        ))}
        {!promotions.length ? <li className="text-ink2">No promotions yet.</li> : null}
      </ul>
    </div>
  );
}
