import Link from "next/link";
import { requireAdminScreen } from "@/lib/admin-auth";
import { EcommerceNav } from "@/components/admin/ecommerce-nav";
import { BrandLogo } from "@/components/brand-logo";

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
        <header className="flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
          <p className="font-semibold">Shop admin</p>
          <Link href="/admin/dashboard" className="text-sm text-goldink">Main Admin</Link>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
