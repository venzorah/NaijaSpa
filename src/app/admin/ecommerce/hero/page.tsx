import { ShopHeroForm } from "@/components/admin/shop-hero-form";

export default function EcommerceHeroPage() {
  return (
    <div>
      <h1 className="font-display text-3xl">Shop hero</h1>
      <p className="mt-2 text-sm text-ink2">Edit the three carousel slides on the Shop homepage. This is separate from the main NaijaSpa homepage banner.</p>
      <ShopHeroForm />
    </div>
  );
}
