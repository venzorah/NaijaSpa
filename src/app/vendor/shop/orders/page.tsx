import { VendorShopOrders } from "@/components/vendor/shop-orders";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div>
      <h1 className="font-display text-2xl">Product orders</h1>
      <VendorShopOrders query={q ?? ""} />
    </div>
  );
}
