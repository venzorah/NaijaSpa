import { VendorShippingForm } from "@/components/vendor/shop-shipping-form";

export default function Page() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Fulfillment</p>
      <h1 className="mt-1 font-display text-3xl">Shipping</h1>
      <p className="text-sm text-ink2">Flat fees per shipment, not per product. Saved onto each order at checkout.</p>
      <VendorShippingForm />
    </div>
  );
}
