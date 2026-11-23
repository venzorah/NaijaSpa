import { ShopCartClient } from "@/components/shop/cart-client";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Bag</p>
      <h1 className="mt-1 font-display text-4xl">Cart</h1>
      <ShopCartClient />
    </div>
  );
}
