import { ShopPromotionManager } from "@/components/admin/shop-promotion-form";

export default function EcommercePromotionsPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Merchandising</p>
      <h1 className="mt-1 font-display text-3xl">Promotions</h1>
      <p className="mt-2 text-sm text-ink2">Featured and sponsored placements on Shop. Separate from homepage hero ads.</p>
      <ShopPromotionManager />
    </div>
  );
}
