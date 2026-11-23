import Link from "next/link";
import { headers } from "next/headers";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/auth";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { PUBLIC_SITE_URL } from "@/lib/public-origin";
import { shopCategories } from "@/lib/shop/catalog";
import { Search, ShoppingBag, UserRound } from "lucide-react";

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
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
          <Link href={href("/")} className="shrink-0">
            <BrandLogo className="h-10 w-auto max-w-[10rem] object-contain object-left" />
            <span className="sr-only">NaijaSpa Shop</span>
          </Link>
          <span className="hidden rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-goldink sm:inline">Shop</span>
          <form action={href("/search")} className="relative ml-auto min-w-0 flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-ink2" />
            <input
              name="q"
              placeholder="Search oils, soaps, tools…"
              className="h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm outline-none ring-gold/40 focus:ring-2"
            />
          </form>
          <Link href={href("/cart")} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-elev">
            <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Cart</span>
          </Link>
          <Link href={user ? href("/orders") : href("/login")} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-bold text-ongold">
            <UserRound className="h-4 w-4" /> {user ? "Orders" : "Sign in"}
          </Link>
        </div>
        <nav className="hidden border-t border-line md:block" aria-label="Categories">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 lg:px-8">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.slug} href={href(`/c/${c.slug}`)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-ink2 hover:bg-elev hover:text-ink">
                {c.name.replace(" Products", "")}
              </Link>
            ))}
            <Link href={href("/search")} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-goldink">
              All →
            </Link>
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
              <Link href={href("/search")}>Browse products</Link>
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
