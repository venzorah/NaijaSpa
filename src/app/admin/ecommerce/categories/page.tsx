import { ShopCategoryManager } from "@/components/admin/shop-category-form";

export default function EcommerceCategoriesPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-3xl">Categories</h1>
      <p className="mt-2 text-sm text-ink2">These power Shop browse. They are not spa service categories.</p>
      <ShopCategoryManager />
    </div>
  );
}
