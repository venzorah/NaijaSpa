"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNgn } from "@/lib/money";
import { shopClientPath } from "@/lib/shop/paths";
import { bumpShopCart, shopError, shopSuccess } from "@/lib/shop/ui-action";

type Variant = { id: string; name: string; priceKobo: number; stockOnHand: number; reserved: number };

export function AddToCart({
  variants,
  productName
}: {
  variants: Variant[];
  productName?: string;
  image?: string;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [busy, setBusy] = useState<"cart" | "buy" | "">("");
  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  const stock = selected ? Math.max(0, selected.stockOnHand - selected.reserved) : 0;

  async function add(next: "cart" | "checkout") {
    if (!selected || busy) return;
    setBusy(next === "checkout" ? "buy" : "cart");
    try {
      const res = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected.id, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add to cart");
      bumpShopCart();
      const label = productName ? `${productName} is in your bag.` : "Added to your bag.";
      shopSuccess(next === "checkout" ? `${label} Continue to checkout.` : `${label} Review your bag.`);
      router.push(shopClientPath(next === "checkout" ? "/checkout" : "/cart"));
    } catch (err) {
      shopError(err instanceof Error ? err.message : "Could not add to cart");
      setBusy("");
    }
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-[1.5rem] border border-line bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void add("cart");
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={Boolean(busy) || !selected || stock < 1} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold px-6 text-sm font-bold text-ongold disabled:opacity-50">
          {busy === "cart" ? "Adding…" : "Add to cart"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !selected || stock < 1}
          onClick={() => void add("checkout")}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line px-6 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "buy" ? "Taking you to checkout…" : "Buy now"}
        </button>
      </div>
    </form>
  );
}
