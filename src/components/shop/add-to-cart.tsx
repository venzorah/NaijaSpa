"use client";

import { useState } from "react";
import { formatNgn } from "@/lib/money";

type Variant = { id: string; name: string; priceKobo: number; stockOnHand: number; reserved: number };

export function AddToCart({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  return (
    <form
      className="mt-6 space-y-3"
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
        <select className="h-11 w-full rounded-2xl border border-line bg-card px-3" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {formatNgn(v.priceKobo)}
            </option>
          ))}
        </select>
      ) : null}
      <button disabled={busy || !selected} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
        {busy ? "Adding…" : "Add to cart"}
      </button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
