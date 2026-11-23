"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNgn } from "@/lib/money";

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
  useEffect(() => {
    fetch("/api/shop/cart")
      .then((r) => r.json())
      .then((d) => setCart(d.cart))
      .catch(() => setCart({ items: [] }));
  }, []);
  if (!cart) return <p className="mt-6 text-sm text-ink2">Loading cart…</p>;
  const groups = new Map<string, Cart["items"]>();
  for (const item of cart.items) {
    const key = item.product.vendor.businessName;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const subtotal = cart.items.reduce((s, i) => s + i.variant.priceKobo * i.quantity, 0);
  return (
    <div className="mt-6 space-y-6">
      {[...groups.entries()].map(([vendor, items]) => (
        <section key={vendor} className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-semibold">{vendor}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.product.name} × {item.quantity}</span>
                <span>{formatNgn(item.variant.priceKobo * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!cart.items.length ? <p className="text-sm text-ink2">Your cart is empty.</p> : null}
      <p className="font-semibold">Product subtotal {formatNgn(subtotal)}</p>
      <p className="text-sm text-ink2">Shipping is calculated per seller at checkout from your delivery state.</p>
      {cart.items.length ? (
        <Link href={typeof window !== "undefined" && window.location.hostname.startsWith("shop.") ? "/checkout" : "/shop/checkout"} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          Checkout
        </Link>
      ) : null}
    </div>
  );
}
