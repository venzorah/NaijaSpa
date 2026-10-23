"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Heart, Home, Moon, Sparkles, Sun, User } from "lucide-react";
import { useTheme } from "./theme-provider";
import { InstallPrompt } from "./install-prompt";

export function BrandLogo({
  className = "h-12 w-auto max-w-[196px] object-contain object-left sm:h-14 sm:max-w-[248px]"
}: {
  className?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-horizontal.png" alt="NaijaSpa" className={`dark:hidden ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-horizontal-dark.png"
        alt="NaijaSpa"
        className={`hidden mix-blend-screen dark:block ${className}`}
      />
    </span>
  );
}

export function TopBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="pt-safe sticky top-0 z-50 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center gap-2 px-4 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="NaijaSpa home">
          <BrandLogo />
        </Link>
        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {[
            ["/", "Home"],
            ["/explore", "Explore"],
            ["/account/bookings", "Bookings"],
            ["/account/favourites", "Favourites"],
            ["/account", "Profile"]
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-semibold text-ink2 hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/ai" aria-label="Ask NaijaSpa AI" className="flex h-11 w-10 items-center justify-center rounded-full text-goldink hover:bg-elev">
            <Sparkles className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-11 w-10 items-center justify-center rounded-full text-ink hover:bg-elev"
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
          const active = href === "/" ? path === "/" : path.startsWith(href);
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
  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=80)"
          }}
        />
        <div className="absolute inset-0 bg-bg/86 dark:bg-bg/88" />
      </div>
      <TopBar />
      <main className="relative pb-28 lg:pb-8">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

export function GoldButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
