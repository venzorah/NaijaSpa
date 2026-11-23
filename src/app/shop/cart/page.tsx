import { ShopCartClient } from "@/components/shop/cart-client";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">Cart</h1>
      <ShopCartClient />
    </div>
  );
}
