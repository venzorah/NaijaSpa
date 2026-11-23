import { SellOnShop } from "@/components/shop/sell-form";
import { shopVendorStates } from "@/lib/shop/ensure";
import { getSession } from "@/lib/auth";

export default async function SellPage() {
  const [states, user] = await Promise.all([shopVendorStates(), getSession()]);
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-3xl">Sell on NaijaSpa Shop</h1>
      <p className="mt-2 text-sm text-ink2">Open to businesses in {states.join(", ")}. Existing service vendors can activate a Product Store without a new account.</p>
      <SellOnShop states={states} canActivate={Boolean(user?.vendorId)} />
    </div>
  );
}
