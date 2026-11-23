import { VendorShippingForm } from "@/components/vendor/shop-shipping-form";

export default function Page() {
  return (
    <div>
      <h1 className="font-display text-2xl">Shipping</h1>
      <p className="text-sm text-ink2">Flat fees per shipment, not per product. Saved onto each order at checkout.</p>
      <VendorShippingForm />
    </div>
  );
}
