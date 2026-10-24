"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Heart, Home, Moon, Sparkles, Sun, User } from "lucide-react";
import { useTheme } from "./theme-provider";
import { InstallPrompt } from "./install-prompt";
import { LocationHubPicker } from "./location-hub-picker";
import { SiteFooter } from "./site-footer";

export function BrandLogo({
  className = "h-14 w-auto max-w-[min(14.5rem,68vw)] shrink-0 object-contain object-left sm:h-16 sm:max-w-[18rem]",
  forceDark = false
}: {
  className?: string;
  forceDark?: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 items-center">
      {forceDark ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className={`mix-blend-screen ${className}`} />
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal.png" alt="NaijaSpa" className={`dark:hidden ${className}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal-dark.png"
            alt="NaijaSpa"
            className={`hidden mix-blend-screen dark:block ${className}`}
          />
        </>
      )}
    </span>
  );
}

function isAuthPath(path: string) {
  return (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/register" ||
    path === "/forgot" ||
    path.startsWith("/invite")
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

export function TopBar() {
  const { theme, toggle } = useTheme();
  const path = usePathname();
  const desktopLinks = [
    ["/", "Home"],
    ["/explore", "Explore"],
    ["/account/bookings", "Bookings"],
    ["/account/favourites", "Favourites"],
    ["/account", "Profile"]
  ] as const;
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-bg/85 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="NaijaSpa home">
          <BrandLogo className="h-10 w-auto max-w-[min(9.5rem,42vw)] object-contain object-left sm:h-11 sm:max-w-[14rem]" />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {desktopLinks.map(([href, label]) => {
            const active = href === "/" ? path === "/" || path.startsWith("/in/") : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-elev text-ink" : "text-ink2 hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <LocationHubPicker />
          <Link
            href="/ai"
            aria-label="Ask NaijaSpa AI"
            className="ml-0.5 flex h-11 w-9 items-center justify-center rounded-full text-goldink hover:bg-elev sm:w-10"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-11 w-9 items-center justify-center rounded-full text-ink hover:bg-elev sm:w-10"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
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
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line/70 bg-bg/90 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" || path.startsWith("/in/") : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-goldink" : "text-ink2"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-gold/15" : ""}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
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
        <div className="absolute inset-0 bg-bg/86 dark:bg-bg/88" />
      </div>
      <TopBar />
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-top))]" />
      <main id="main" className="relative min-w-0 w-full pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-8">
        {children}
        {hideSiteFooter(path) ? null : <SiteFooter />}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

export function GoldButton({
  children,
  className = "",
  tone = "solid",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "solid" | "outline" }) {
  const look =
    tone === "outline"
      ? "border border-gold/50 bg-transparent text-goldink hover:bg-gold/10"
      : "bg-gold text-ongold";
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold disabled:opacity-50 ${look} ${className}`}
    >
      {children}
    </button>
  );
}
