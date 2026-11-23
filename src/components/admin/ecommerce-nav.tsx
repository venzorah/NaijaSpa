"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["Overview", "/admin/ecommerce"],
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
];

export function EcommerceNav() {
  const path = usePathname();
  return (
    <nav className="mt-6 space-y-1">
      {LINKS.map(([label, href]) => {
        const active = href === "/admin/ecommerce" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-elev font-semibold text-ink" : "text-ink2 hover:bg-elev hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
