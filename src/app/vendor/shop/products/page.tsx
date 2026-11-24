import { VendorProductForm } from "@/components/vendor/shop-product-form";

export default function VendorShopProductsPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-3xl">My products</h1>
      <p className="mt-2 text-sm text-ink2">Upload a featured photo and two gallery photos, then add an SEO title and meta description. Listings stay pending until Admin approves.</p>
      <VendorProductForm />
    </div>
  );
}
