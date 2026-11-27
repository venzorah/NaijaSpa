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
    <PortalLogin
      portal="customer"
      title="Shop sign in"
      subtitle="Use your NaijaSpa account. There is no second password for Shop."
      defaultNext={next}
    />
  );
}
