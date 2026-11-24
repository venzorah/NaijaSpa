"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shopClientPath } from "@/lib/shop/paths";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

export function FindShopOrderForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 grid gap-3 rounded-[1.75rem] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/shop/orders/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fd.get("email"), number: fd.get("number") })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not find that order.");
          shopSuccess("Order found. Opening it now.");
          router.push(shopClientPath(`/orders/${data.order.id}`));
        } catch (err) {
          const text = err instanceof Error ? err.message : "Could not find that order.";
          setError(text);
          shopError(text);
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">Find an order</p>
      <p className="text-sm text-ink2">No account needed. Use the email you paid with and the order number from your receipt.</p>
      <input required type="email" name="email" placeholder="Email" className="h-11 rounded-2xl border border-line px-3 text-sm" />
      <input required name="number" placeholder="Order number (NS-2026-00001)" className="h-11 rounded-2xl border border-line px-3 text-sm uppercase" />
      <button disabled={busy} className="h-11 rounded-full bg-gold text-sm font-bold text-ongold disabled:opacity-60">
        {busy ? "Looking…" : "Open order"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
