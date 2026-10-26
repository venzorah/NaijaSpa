"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarCheck2,
  CalendarDays,
  Crown,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Megaphone,
  Moon,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Users,
  Wallet,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandLogo } from "@/components/shell";
import { LogoutButton } from "@/components/logout-button";
import { ADMIN_SCREEN_GROUPS, ADMIN_SCREENS, accessForScreen, type AdminScreenId } from "@/lib/admin";

export type PortalLink = { href: string; label: string; icon: LucideIcon; badge?: string };

export const VENDOR_NAV: { label: string; items: PortalLink[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/vendor/bookings", label: "Bookings", icon: CalendarCheck2 },
      { href: "/vendor/availability", label: "Availability", icon: CalendarDays }
    ]
  },
  {
    label: "Business",
    items: [
      { href: "/vendor/profile", label: "Business profile", icon: Store },
      { href: "/vendor/listing", label: "Listing details", icon: Phone },
      { href: "/vendor/services", label: "Services", icon: Sparkles },
      { href: "/vendor/staff", label: "Staff & schedules", icon: Users },
      { href: "/vendor/galleries", label: "Galleries", icon: ImageIcon }
    ]
  },
  {
    label: "Money",
    items: [
      { href: "/vendor/earnings", label: "Earnings & payouts", icon: Wallet },
      { href: "/vendor/subscriptions", label: "Listing plans", icon: Crown }
    ]
  },
  {
    label: "Growth",
    items: [
      { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/vendor/campaigns", label: "Sponsored", icon: Megaphone }
    ]
  },
  {
    label: "Account",
    items: [
      { href: "/vendor/settings", label: "Settings", icon: Settings },
      { href: "/vendor/support", label: "Support", icon: LifeBuoy }
    ]
  }
];

export function adminNavForRole(role: string): { label: string; items: (PortalLink & { viewOnly?: boolean })[] }[] {
  return ADMIN_SCREEN_GROUPS.map((group) => ({
    label: group,
    items: ADMIN_SCREENS.filter((s) => s.group === group && accessForScreen(role, s.id)).map((s) => ({
      href: s.href,
      label: s.label,
      icon: s.icon,
      viewOnly: accessForScreen(role, s.id) === "view"
    }))
  })).filter((g) => g.items.length > 0);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function linkActive(path: string, href: string) {
  if (href === "/vendor/dashboard") return path === "/vendor" || path === "/vendor/dashboard";
  if (href === "/admin/dashboard") return path === "/admin" || path === "/admin/dashboard" || path.startsWith("/admin/dashboard?");
  return path === href || path.startsWith(`${href}/`);
}

function NavList({
  groups,
  path,
  onNavigate
}: {
  groups: { label: string; items: (PortalLink & { viewOnly?: boolean; badge?: string })[] }[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink2">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = linkActive(path, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={`relative flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm ${
                      active ? "bg-elev font-medium text-ink" : "text-ink2 hover:bg-elev hover:text-ink"
                    }`}
                  >
                    {active ? <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-gold" aria-hidden /> : null}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-goldink" : ""}`} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-goldink">{item.badge}</span>
                    ) : null}
                    {item.viewOnly ? (
                      <span className="rounded border border-line px-1 text-[9px] uppercase tracking-wide text-ink2">View</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function PortalChrome({
  variant,
  title,
  subtitle,
  userName,
  role,
  alerts = 0,
  businessName,
  planPaid,
  planLabel,
  bookingBadge,
  children
}: {
  variant: "vendor" | "admin";
  title: string;
  subtitle: string;
  userName: string;
  role?: string;
  alerts?: number;
  businessName?: string;
  planPaid?: boolean;
  planLabel?: string;
  bookingBadge?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups =
    variant === "vendor"
      ? VENDOR_NAV.map((g) => ({
          ...g,
          items: g.items.map((item) => (item.href === "/vendor/bookings" && bookingBadge ? { ...item, badge: bookingBadge } : item))
        }))
      : adminNavForRole(role || "");
  const home = variant === "vendor" ? "/vendor/dashboard" : "/admin/dashboard";
  const currentScreen = ADMIN_SCREENS.find((s) => linkActive(path, s.href));

  const sidebar = (
    <div className="flex h-full flex-col bg-bg2">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <Link href={home} aria-label="NaijaSpa home" onClick={() => setMenuOpen(false)}>
          <BrandLogo className="h-12 w-auto max-w-[12.5rem] object-contain object-left" />
        </Link>
      </div>
      {variant === "vendor" && businessName ? (
        <div className="mx-3 mb-1 mt-3 flex items-center gap-3 rounded-xl border border-line bg-elev p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-[11px] font-semibold text-gold">
            {initials(businessName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{businessName}</p>
            <p className="flex items-center gap-1 text-sm text-ink2">
              <ShieldCheck className="h-3.5 w-3.5 text-goldink" aria-hidden />
              {subtitle}
            </p>
          </div>
        </div>
      ) : (
        <p className="px-4 pt-3 text-[11px] text-ink2">{subtitle}</p>
      )}
      <NavList groups={groups} path={path} onNavigate={() => setMenuOpen(false)} />
      <div className="border-t border-line p-3">
        {variant === "vendor" ? (
          <div className="rounded-xl border border-line bg-elev p-3.5">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-goldink" aria-hidden />
              <p className="text-sm font-medium">{planPaid ? planLabel || "Paid" : "Free plan · 10% commission"}</p>
            </div>
            <p className="mt-1 text-xs text-ink2">
              {planPaid ? "0% commission while this plan is active." : "Go Paid to keep 100% and show phone & WhatsApp."}
            </p>
            <Link
              href="/vendor/subscriptions"
              onClick={() => setMenuOpen(false)}
              className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-gold text-xs font-bold text-ongold"
            >
              {planPaid ? "Manage plan" : "Upgrade"}
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg bg-elev p-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-gold ring-1 ring-gold/40">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userName}</p>
              <p className="flex items-center gap-1 truncate text-[11px] text-ink2">
                <ShieldCheck className="h-3 w-3 text-goldink" aria-hidden />
                {subtitle}
              </p>
            </div>
          </div>
        )}
        <LogoutButton
          variant="row"
          href={variant === "admin" ? "/login/admin" : "/login/vendor"}
          className="mt-2"
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-bg text-ink">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-line lg:block">{sidebar}</aside>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-bg2">{sidebar}</aside>
          <button
            type="button"
            className="absolute left-[17rem] top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg px-3 sm:px-5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-elev lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          {variant === "admin" ? (
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="admin-screen-switcher" className="hidden text-[11px] font-medium uppercase tracking-wide text-ink2 md:block">
                Screen
              </label>
              <select
                id="admin-screen-switcher"
                value={currentScreen?.id ?? "dashboard"}
                onChange={(e) => {
                  const next = ADMIN_SCREENS.find((s) => s.id === (e.target.value as AdminScreenId));
                  if (next) router.push(next.href);
                }}
                className="h-8 w-40 rounded-md border border-line bg-elev px-2 text-xs sm:w-56"
              >
                {groups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.href} value={ADMIN_SCREENS.find((s) => s.href === item.href)?.id ?? item.href}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <p className="hidden min-w-0 truncate text-sm text-ink2 lg:block">
              {businessName || title} <span className="mx-1.5 text-line">/</span>
              <span className="text-ink">{groups.flatMap((g) => g.items).find((i) => linkActive(path, i.href))?.label ?? "Dashboard"}</span>
            </p>
          )}
          {variant === "admin" ? (
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-forest/30 bg-forest/10 px-2 py-0.5 text-[11px] font-medium text-forest xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" aria-hidden /> Production · Lagos (WAT)
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            {variant === "vendor" ? (
              <form
                className="relative hidden md:block"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/vendor/bookings?q=${encodeURIComponent(query)}`);
                }}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search bookings, customers, services"
                  placeholder="Search bookings, customers…"
                  className="h-9 w-64 rounded-lg border border-line bg-elev pl-9 pr-3 text-sm"
                />
              </form>
            ) : null}
            {variant === "vendor" ? (
              <Link href="/vendor/subscriptions" className="hidden sm:block" aria-label="Listing plan status">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${planPaid ? "bg-gold/15 text-goldink" : "bg-elev text-ink2"}`}>
                  {planPaid ? "Paid · 0%" : "Free · 10%"}
                </span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-elev"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {variant === "admin" || variant === "vendor" ? (
              <Link
                href={variant === "admin" ? "/admin/support" : "/vendor/support"}
                aria-label={alerts ? `Notifications, ${alerts} open` : "Notifications"}
                className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-elev"
              >
                <Bell className="h-4 w-4" />
                {alerts > 0 ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" aria-hidden /> : null}
              </Link>
            ) : null}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/10 text-xs font-semibold text-forest">
              {initials(userName)}
            </span>
            <LogoutButton
              variant="compact"
              href={variant === "admin" ? "/login/admin" : "/login/vendor"}
              className="hidden lg:inline-flex"
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-3 pb-16 pt-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
