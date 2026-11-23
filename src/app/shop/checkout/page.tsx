import { ShopCheckoutForm } from "@/components/shop/checkout-form";
import { NIGERIA_STATES } from "@/lib/nigeria";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">Checkout</h1>
      <p className="mt-2 text-sm text-ink2">One address, one payment. Each seller’s shipping is shown separately.</p>
      <ShopCheckoutForm states={[...NIGERIA_STATES]} />
    </div>
  );
}
