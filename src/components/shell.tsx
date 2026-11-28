"use client";

import { useEffect } from "react";
import Link, { useLinkStatus } from "next/link";
import NavigationLink from "@/components/navigation-link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Heart, Home, LoaderCircle, Moon, Sparkles, Sun, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { InstallPrompt } from "./install-prompt";
import { LocationHubPicker } from "./location-hub-picker";
import { SiteFooter } from "./site-footer";
import { LogoutButton } from "./logout-button";
import { BrandLogo } from "./brand-logo";
import { customerNavActive } from "@/lib/customer-nav";
import type { TickerItem } from "@/lib/ticker";
import { TopBarTicker, useTopBarTicker } from "./top-bar-ticker";

function isAuthPath(path: string) {
  return (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/shop/login" ||
    path === "/register" ||
    path === "/forgot" ||
    path === "/reset" ||
    path.startsWith("/invite") ||
    path === "/find-bookings" ||
    path.startsWith("/find-bookings/")
  );
}

function hideSiteFooter(path: string) {
  return (
    isAuthPath(path) ||
    path === "/ai" ||
    path === "/offline" ||
    path.startsWith("/book/") ||
    path.startsWith("/checkout")
  );
}

export function TopBar({ signedIn = false, tickerItems = [] }: { signedIn?: boolean; tickerItems?: TickerItem[] }) {
  const { theme, toggle } = useTheme();
  const path = usePathname();
  const ticker = useTopBarTicker(tickerItems);
  const desktopLinks = [
    ["/", "Home"],
    ["/explore", "Explore"],
    ["/account/bookings", "Bookings"],
    ["/account/favourites", "Favourites"],
    ["/account", "Profile"]
  ] as const;
  return (
    <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/92 pt-safe backdrop-blur-xl dark:bg-bg/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:px-8">
        <NavigationLink href="/" className="flex min-w-0 shrink-0 items-center" aria-label="NaijaSpa home">
          <BrandLogo className="h-12 w-auto max-w-[min(12.5rem,52vw)] object-contain object-left sm:h-14 sm:max-w-[16.5rem]" />
        </NavigationLink>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {desktopLinks.map(([href, label]) => {
            const active = customerNavActive(path, href);
            return (
              <NavigationLink
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-elev text-ink" : "text-ink2 hover:text-ink"}`}
              >
                {label}
              </NavigationLink>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <LocationHubPicker />
          <NavigationLink
            href="/ai"
            aria-label="Ask NaijaSpa AI"
            className="ml-0.5 flex h-11 w-9 items-center justify-center rounded-full text-goldink hover:bg-elev sm:w-10"
          >
            <Sparkles className="h-5 w-5" />
          </NavigationLink>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-11 w-9 items-center justify-center rounded-full text-ink hover:bg-elev sm:w-10"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {signedIn ? (
            <LogoutButton variant="compact" href="/login" className="hidden h-11 px-3 lg:inline-flex" />
          ) : null}
        </div>
      </div>
      <TopBarTicker items={ticker} />
    </header>
    <div
      aria-hidden
      className={ticker.length ? "h-[calc(6.5rem+env(safe-area-inset-top))]" : "h-[calc(4rem+env(safe-area-inset-top))]"}
    />
    </>
  );
}

function BottomNavIcon({ icon: Icon, active, label }: { icon: LucideIcon; active: boolean; label: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <span role="status" className="flex h-7 w-12 items-center justify-center">
      <LoaderCircle className="h-5 w-5 animate-spin text-goldink" aria-hidden />
      <span className="sr-only">Opening {label}…</span>
    </span>
  ) : (
    <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-gold/15" : ""}`}>
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function BottomNav() {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/account/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/account/favourites", label: "Favourites", icon: Heart },
    { href: "/account", label: "Profile", icon: User }
  ];
  return (
    <nav
      aria-label="Main"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-bg/95 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = customerNavActive(path, href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 w-full touch-manipulation flex-col items-center justify-start gap-0.5 px-1 pt-2 text-[11px] font-semibold [-webkit-tap-highlight-color:transparent] ${active ? "text-goldink" : "text-ink2"} ${
                  href === "/account" ? "pr-[max(0.25rem,env(safe-area-inset-right))]" : ""
                }`}
                style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
              >
                <BottomNavIcon icon={Icon} active={active} label={label} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CustomerShell({
  children,
  signedIn = false,
  tickerItems = []
}: {
  children: React.ReactNode;
  signedIn?: boolean;
  tickerItems?: TickerItem[];
}) {
  const path = usePathname();
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [path]);
  if (isAuthPath(path)) {
    return (
      <div className="relative min-h-dvh min-w-0 bg-bg text-ink">
        <main className="relative min-w-0 w-full">{children}</main>
        <InstallPrompt />
      </div>
    );
  }
  return (
    <div className="relative min-h-screen min-w-0 bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-ongold"
      >
        Skip to content
      </a>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/photos/bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-bg/86 dark:bg-bg/93" />
      </div>
      <TopBar signedIn={signedIn} tickerItems={tickerItems} />
      <main id="main" className="relative min-w-0 w-full pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8">
        {children}
        {hideSiteFooter(path) ? null : <SiteFooter />}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

