"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  Crown,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Users,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandLogo } from "@/components/shell";

export type PortalLink = { href: string; label: string; icon: LucideIcon };

export const VENDOR_NAV: { label: string; items: PortalLink[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
      { href: "/vendor/bookings", label: "Bookings", icon: CalendarCheck2 }
    ]
  },
  {
    label: "Business",
    items: [
      { href: "/vendor/onboarding", label: "Onboarding", icon: ClipboardList },
      { href: "/vendor/services", label: "Services", icon: Sparkles },
      { href: "/vendor/galleries", label: "Galleries", icon: ImageIcon }
    ]
  },
  {
    label: "Money",
    items: [
      { href: "/vendor/earnings", label: "Earnings", icon: Wallet },
      { href: "/vendor/subscriptions", label: "Subscription", icon: Crown }
    ]
  },
  {
    label: "Account",
    items: [
      { href: "/vendor/settings", label: "Settings", icon: Settings }
    ]
  }
];

export const ADMIN_NAV: { label: string; items: PortalLink[] }[] = [
  {
    label: "Marketplace",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Customers", icon: Users },
      { href: "/admin/vendors", label: "Vendors", icon: Store },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2 }
    ]
  },
  {
    label: "Money",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet },
      { href: "/admin/commercial", label: "Commercial", icon: Crown },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone }
    ]
  },
  {
    label: "Content",
    items: [
      { href: "/admin/cms", label: "CMS", icon: ClipboardList },
      { href: "/admin/hero", label: "Hero & ads", icon: ImageIcon }
    ]
  },
  {
    label: "Ops",
    items: [
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/ai", label: "AI", icon: Sparkles },
      { href: "/admin/audit", label: "Audit", icon: BarChart3 }
    ]
  }
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function linkActive(path: string, href: string) {
  if (href === "/vendor" || href === "/admin") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

function NavList({
  groups,
  path,
  onNavigate
}: {
  groups: { label: string; items: PortalLink[] }[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink2">{group.label}</p>
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
                    className={`relative flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] ${
                      active ? "bg-elev font-medium text-ink" : "text-ink2 hover:bg-elev hover:text-ink"
                    }`}
                  >
                    {active ? <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-gold" aria-hidden /> : null}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-goldink" : ""}`} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
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
  children
}: {
  variant: "vendor" | "admin";
  title: string;
  subtitle: string;
  userName: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = variant === "vendor" ? VENDOR_NAV : ADMIN_NAV;
  const home = variant === "vendor" ? "/vendor" : "/admin";

  const sidebar = (
    <div className="flex h-full flex-col bg-bg2">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <Link href={home} aria-label="NaijaSpa home" onClick={() => setMenuOpen(false)}>
          <BrandLogo className="h-10 w-auto max-w-[10rem] object-contain object-left" />
        </Link>
      </div>
      <p className="px-4 pt-3 text-[11px] text-ink2">{subtitle}</p>
      <NavList groups={groups} path={path} onNavigate={() => setMenuOpen(false)} />
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-elev p-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-gold ring-1 ring-gold/40">
            {initials(userName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="flex items-center gap-1 truncate text-[11px] text-ink2">
              <ShieldCheck className="h-3 w-3 text-goldink" aria-hidden />
              {variant === "admin" ? "Admin console" : "Vendor portal"}
            </p>
          </div>
        </div>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg px-4 md:px-8">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-elev lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <BrandLogo className="h-9 w-auto max-w-[8rem] object-contain object-left" />
          </div>
          <p className="hidden min-w-0 truncate text-sm text-ink2 lg:block">
            {title} <span className="mx-1.5 text-line">/</span>
            <span className="text-ink">
              {groups.flatMap((g) => g.items).find((i) => linkActive(path, i.href))?.label ?? "Dashboard"}
            </span>
          </p>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-elev"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/10 text-xs font-semibold text-forest">
              {initials(userName)}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
