"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { shopClientPath } from "@/lib/shop/paths";
import { SHOP_CART_CHANGED } from "@/lib/shop/ui-action";

export function ShopCartBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => {
      fetch("/api/shop/cart")
        .then((r) => r.json())
        .then((d) => {
          const items = d.cart?.items as { quantity?: number }[] | undefined;
          setCount((items ?? []).reduce((sum, item) => sum + (item.quantity || 0), 0));
        })
        .catch(() => setCount(0));
    };
    refresh();
    window.addEventListener(SHOP_CART_CHANGED, refresh);
    return () => window.removeEventListener(SHOP_CART_CHANGED, refresh);
  }, []);
  return (
    <Link
      href={shopClientPath("/cart")}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line hover:bg-elev sm:h-11 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:text-sm sm:font-semibold"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="hidden sm:inline">Cart</span>
      {count ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ongold sm:static sm:ml-0.5 sm:h-5 sm:min-w-5">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
