import { VendorProductForm } from "@/components/vendor/shop-product-form";

export default function VendorShopProductsPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-3xl">My products</h1>
      <p className="mt-2 text-sm text-ink2">Add a product or tap Edit on a listing to change photos, price, stock and details. New listings stay pending until Admin approves. Live products stay on Shop when you save changes.</p>
      <VendorProductForm />
    </div>
  );
}
