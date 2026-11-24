import Link from "next/link";
import { requireAdminScreen } from "@/lib/admin-auth";
import { EcommerceNav } from "@/components/admin/ecommerce-nav";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function EcommerceAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminScreen("ecommerce");
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-bg2 p-5 lg:block">
        <BrandLogo className="h-8 w-auto object-contain object-left" />
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-goldink">Ecommerce admin</p>
        <EcommerceNav />
        <Link href="/admin/dashboard" className="mt-8 inline-flex rounded-full border border-line px-3 py-2 text-sm font-semibold">
          Back to Main Admin
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <p className="font-semibold lg:hidden">Shop admin</p>
            <p className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-goldink lg:block">NaijaSpa Shop</p>
            <Link href="/admin/dashboard" className="text-sm font-semibold text-goldink">
              Main Admin
            </Link>
          </div>
          <div className="px-3 pb-2 lg:hidden">
            <EcommerceNav orientation="row" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
