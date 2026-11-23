"use client";

import { useState } from "react";
import { formatNgn } from "@/lib/money";
import { shopClientPath } from "@/lib/shop/paths";

type Variant = { id: string; name: string; priceKobo: number; stockOnHand: number; reserved: number };

export function AddToCart({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  const stock = selected ? Math.max(0, selected.stockOnHand - selected.reserved) : 0;
  return (
    <form
      className="mt-6 space-y-3 rounded-[1.5rem] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!selected) return;
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch("/api/shop/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: selected.id, quantity: 1 }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not add to cart");
          setMessage("Added to cart.");
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Could not add to cart");
        } finally {
          setBusy(false);
        }
      }}
    >
      {variants.length > 1 ? (
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink2">
          Option
          <select className="mt-1 h-11 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-medium text-ink" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {formatNgn(v.priceKobo)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="text-xs text-ink2">{stock > 0 ? `${stock} in stock` : "Out of stock"}</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy || !selected || stock < 1} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold px-6 text-sm font-bold text-ongold disabled:opacity-50">
          {busy ? "Adding…" : "Add to cart"}
        </button>
        <a href={shopClientPath("/cart")} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">
          View cart
        </a>
      </div>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
