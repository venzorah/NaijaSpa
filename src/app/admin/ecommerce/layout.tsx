import Link from "next/link";
import { requireAdminScreen } from "@/lib/admin-auth";

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

export default async function EcommerceAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminScreen("ecommerce");
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-bg2 p-4 lg:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-goldink">Ecommerce</p>
        <p className="mt-1 text-sm font-semibold">NaijaSpa Shop</p>
        <nav className="mt-6 space-y-1">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-ink2 hover:bg-elev hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/admin/dashboard" className="mt-8 block text-sm font-semibold text-goldink">
          Back to Main Admin
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
          <p className="font-semibold">Shop admin</p>
          <Link href="/admin/dashboard" className="text-sm text-goldink">Main Admin</Link>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
