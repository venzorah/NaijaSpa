import Link from "next/link";
import { headers } from "next/headers";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/auth";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { PUBLIC_SITE_URL } from "@/lib/public-origin";
import { Search, ShoppingBag, UserRound } from "lucide-react";

export async function ShopChrome({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const shopHost = shopHostFromHeaders(hdrs);
  const href = (path: string) => shopPublicPath(path.startsWith("/shop") ? path : `/shop${path === "/" ? "" : path}`, shopHost);
  const user = await getSession();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
          <Link href={href("/")} className="shrink-0">
            <BrandLogo className="h-10 w-auto max-w-[10rem] object-contain object-left" />
            <span className="sr-only">NaijaSpa Shop</span>
          </Link>
          <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-goldink sm:block">Shop</p>
          <form action={href("/search")} className="relative ml-auto min-w-0 flex-1 max-w-xl">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink2" />
            <input name="q" placeholder="Search oils, soaps, tools…" className="h-10 w-full rounded-full border border-line bg-card pl-9 pr-4 text-sm" />
          </form>
          <Link href={href("/cart")} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" /> Cart
          </Link>
          <Link href={user ? href("/orders") : href("/login")} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gold px-3 text-sm font-bold text-ongold">
            <UserRound className="h-4 w-4" /> {user ? "Orders" : "Sign in"}
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-line py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-ink2 lg:px-8">
          <p>NaijaSpa Shop · beauty and wellness products</p>
          <div className="flex gap-4">
            <Link href={href("/sell")}>Sell on Shop</Link>
            <a href={PUBLIC_SITE_URL}>Book spa services</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
