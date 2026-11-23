import { ShopCheckoutForm } from "@/components/shop/checkout-form";
import { NIGERIA_STATES } from "@/lib/nigeria";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Pay once</p>
      <h1 className="mt-1 font-display text-4xl">Checkout</h1>
      <p className="mt-2 max-w-xl text-sm text-ink2">One address and one Paystack charge. Sellers dispatch independently.</p>
      <ShopCheckoutForm states={[...NIGERIA_STATES]} />
    </div>
  );
}
