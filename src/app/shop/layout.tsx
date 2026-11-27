import type { Metadata } from "next";
import { headers } from "next/headers";
import { ShopChrome } from "@/components/shop/shop-chrome";
import { SHOP_PUBLIC_URL } from "@/lib/shop-host";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "NaijaSpa Shop", template: "%s · NaijaSpa Shop" },
  description: "Buy skincare, spa and wellness products from verified Nigerian sellers.",
  metadataBase: new URL(SHOP_PUBLIC_URL),
  robots: { index: true, follow: true }
};

function isShopAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/shop/login";
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-naijaspa-pathname") || "";
  if (isShopAuthPath(pathname)) return children;
  return <ShopChrome>{children}</ShopChrome>;
}
