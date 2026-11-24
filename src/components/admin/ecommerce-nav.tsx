"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["Overview", "/admin/ecommerce"],
  ["Hero", "/admin/ecommerce/hero"],
  ["Vendors", "/admin/ecommerce/vendors"],
  ["Products", "/admin/ecommerce/products"],
  ["Categories", "/admin/ecommerce/categories"],
  ["Orders", "/admin/ecommerce/orders"],
  ["Plans", "/admin/ecommerce/plans"],
  ["Settlements", "/admin/ecommerce/payouts"],
  ["Returns", "/admin/ecommerce/returns"],
  ["Promotions", "/admin/ecommerce/promotions"],
  ["Reports", "/admin/ecommerce/reports"],
  ["Settings", "/admin/ecommerce/settings"]
] as const;

export function ecommerceNavActive(path: string, href: string) {
  if (href === "/admin/ecommerce") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

export function EcommerceNav({ orientation = "side" }: { orientation?: "side" | "row" }) {
  const path = usePathname();
  const row = orientation === "row";
  return (
    <nav
      aria-label="Ecommerce admin"
      className={row ? "flex gap-1 overflow-x-auto pb-1" : "mt-6 space-y-1"}
    >
      {LINKS.map(([label, href]) => {
        const active = ecommerceNavActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={
              row
                ? `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-gold/15 text-goldink" : "text-ink2 hover:bg-elev hover:text-ink"}`
                : `block rounded-lg px-3 py-2 text-sm ${active ? "bg-elev font-semibold text-ink" : "text-ink2 hover:bg-elev hover:text-ink"}`
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
