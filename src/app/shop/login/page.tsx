import { headers } from "next/headers";
import { PortalLogin } from "@/components/portal-login";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function ShopLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSession();
  const shopHost = shopHostFromHeaders(await headers());
  const orders = shopPublicPath("/shop/orders", shopHost);
  const next = (await searchParams).next || orders;
  if (user) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Account</p>
      <h1 className="mt-1 font-display text-4xl">Shop sign in</h1>
      <p className="mt-2 text-sm text-ink2">Use your NaijaSpa account. There is no second password for Shop.</p>
      <div className="mt-6">
        <PortalLogin portal="customer" title="Shop sign in" subtitle="Same account as spa bookings." defaultNext={next} />
      </div>
    </div>
  );
}
