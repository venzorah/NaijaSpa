import Link from "next/link";
import { headers } from "next/headers";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/auth";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { PUBLIC_SITE_URL } from "@/lib/public-origin";
import { shopCategories } from "@/lib/shop/catalog";
import { ShopCartBadge } from "@/components/shop/cart-badge";
import { Search, UserRound } from "lucide-react";

export async function ShopChrome({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const shopHost = shopHostFromHeaders(hdrs);
  const href = (path: string) => shopPublicPath(path.startsWith("/shop") ? path : `/shop${path === "/" ? "" : path}`, shopHost);
  const [user, categories] = await Promise.all([
    getSession().catch(() => null),
    shopCategories().catch(() => [])
  ]);
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
          <Link href={href("/")} className="shrink-0">
            <BrandLogo className="h-8 w-auto max-w-[7.5rem] object-contain object-left sm:h-10 sm:max-w-[10rem]" />
            <span className="sr-only">NaijaSpa Shop</span>
          </Link>
          <span className="hidden rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-goldink sm:inline">Shop</span>
          <form action={href("/search")} className="relative min-w-0 flex-1 max-w-xl">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink2 sm:left-3.5 sm:h-4 sm:w-4" />
            <input
              name="q"
              placeholder="Search…"
              className="h-9 w-full rounded-full border border-line bg-card pl-8 pr-3 text-[12px] outline-none ring-gold/40 focus:ring-2 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
            />
          </form>
          <Link href={href("/search")} className="hidden h-11 items-center px-3 text-sm font-semibold hover:text-goldink sm:inline-flex">
            Explore
          </Link>
          <ShopCartBadge />
          <Link href={user ? href("/orders") : href("/login")} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-gold px-2.5 text-[11px] font-bold text-ongold sm:h-11 sm:gap-1.5 sm:px-4 sm:text-sm">
            <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span>{user ? "Orders" : "Sign in"}</span>
          </Link>
        </div>
        <nav className="border-t border-line" aria-label="Shop menu">
          <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-1.5 sm:px-4 sm:py-2 lg:px-8">
            <Link href={href("/search")} className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-goldink sm:px-3 sm:py-1.5 sm:text-xs">
              Explore
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} href={href(`/c/${c.slug}`)} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-ink2 hover:bg-elev hover:text-ink sm:px-3 sm:py-1.5 sm:text-xs">
                {c.name.replace(" Products", "").replace(" and ", " & ")}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-line bg-bg2">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3 lg:px-8">
          <div>
            <BrandLogo className="h-9 w-auto object-contain object-left" />
            <p className="mt-3 max-w-xs text-sm text-ink2">Specialised beauty and wellness products from approved Nigerian sellers. Treatments stay on the main site.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Shop</p>
            <div className="mt-3 flex flex-col gap-2 text-ink2">
              <Link href={href("/search")}>Explore</Link>
              <Link href={href("/sell")}>Sell on Shop</Link>
              <Link href={href("/orders")}>Order tracking</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">NaijaSpa</p>
            <div className="mt-3 flex flex-col gap-2 text-ink2">
              <a href={PUBLIC_SITE_URL}>Book spa services</a>
              <a href={`${PUBLIC_SITE_URL}/explore`}>Explore therapists</a>
              <a href={`${PUBLIC_SITE_URL}/become-a-vendor`}>Become a vendor</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
