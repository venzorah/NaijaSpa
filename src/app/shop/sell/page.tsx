import { SellOnShop } from "@/components/shop/sell-form";
import { shopVendorStates } from "@/lib/shop/ensure";
import { getSession } from "@/lib/auth";

export default async function SellPage() {
  const [states, user] = await Promise.all([shopVendorStates(), getSession()]);
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Sellers</p>
      <h1 className="mt-1 font-display text-4xl">Sell on NaijaSpa Shop</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink2">Open to businesses in {states.join(", ")}. Existing service vendors can activate a Product Store without a new account.</p>
      <SellOnShop states={states} canActivate={Boolean(user?.vendorId)} />
    </div>
  );
}
