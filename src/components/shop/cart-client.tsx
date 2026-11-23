"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNgn } from "@/lib/money";
import { shopClientPath } from "@/lib/shop/paths";
import { Minus, Plus, ShoppingBag } from "lucide-react";

type Cart = {
  items: {
    id: string;
    quantity: number;
    variant: { priceKobo: number; name: string };
    product: { name: string; vendor: { businessName: string } };
  }[];
};

export function ShopCartClient() {
  const [cart, setCart] = useState<Cart | null>(null);
  async function load() {
    const res = await fetch("/api/shop/cart");
    const d = await res.json();
    setCart(d.cart ?? { items: [] });
  }
  useEffect(() => {
    load().catch(() => setCart({ items: [] }));
  }, []);
  async function setQty(itemId: string, quantity: number) {
    await fetch("/api/shop/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, quantity }) });
    await load();
  }
  if (!cart) return <p className="mt-8 text-sm text-ink2">Loading cart…</p>;
  const groups = new Map<string, Cart["items"]>();
  for (const item of cart.items) {
    const key = item.product.vendor.businessName;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const subtotal = cart.items.reduce((s, i) => s + i.variant.priceKobo * i.quantity, 0);
  if (!cart.items.length) {
    return (
      <div className="mt-10 rounded-[2rem] border border-dashed border-line bg-card px-6 py-16 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-goldink" />
        <h2 className="mt-4 font-display text-2xl">Your bag is empty</h2>
        <p className="mt-2 text-sm text-ink2">Add oils, soaps or tools from approved sellers.</p>
        <Link href={shopClientPath("/search")} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          Browse products
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        {[...groups.entries()].map(([vendor, items]) => (
          <section key={vendor} className="rounded-[1.75rem] border border-line bg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-goldink">Seller</p>
            <h2 className="mt-1 font-semibold">{vendor}</h2>
            <ul className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-ink2">{item.variant.name} · {formatNgn(item.variant.priceKobo)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="rounded-full border border-line p-1" onClick={() => void setQty(item.id, item.quantity - 1)} aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button type="button" className="rounded-full border border-line p-1" onClick={() => void setQty(item.id, item.quantity + 1)} aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-20 text-right font-semibold">{formatNgn(item.variant.priceKobo * item.quantity)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <aside className="h-fit rounded-[1.75rem] border border-line bg-card p-6">
        <h2 className="font-display text-2xl">Summary</h2>
        <p className="mt-4 flex justify-between text-sm"><span>Products</span><span>{formatNgn(subtotal)}</span></p>
        <p className="mt-2 text-xs text-ink2">Shipping is calculated per seller after you enter a delivery state.</p>
        <Link href={shopClientPath("/checkout")} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold text-sm font-bold text-ongold">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
