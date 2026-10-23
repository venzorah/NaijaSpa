import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BrandLogo } from "@/components/shell";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/vendor");
  if (!["vendor_owner", "vendor_staff"].includes(user.role)) redirect("/account");
  const links = [
    ["/vendor", "Dashboard"],
    ["/vendor/services", "Services"],
    ["/vendor/galleries", "Galleries"],
    ["/vendor/bookings", "Bookings"],
    ["/vendor/subscriptions", "Subscriptions"],
    ["/vendor/earnings", "Earnings"],
    ["/vendor/onboarding", "Onboarding"],
    ["/vendor/settings", "Settings"]
  ];
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/92 pt-safe backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center px-4">
          <Link href="/vendor" aria-label="NaijaSpa vendor home">
            <BrandLogo className="h-10 w-auto max-w-[10rem] object-contain object-left" />
          </Link>
        </div>
        <nav aria-label="Vendor" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full bg-elev px-3 py-2 text-xs font-semibold">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-line bg-bg2 p-4 lg:block">
          <Link href="/vendor" aria-label="NaijaSpa vendor home">
            <BrandLogo className="h-14 w-auto max-w-full object-contain object-left" />
          </Link>
          <p className="mt-1 text-xs text-ink2">Vendor portal</p>
          <nav className="mt-6 grid gap-1">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-xl px-3 py-2 text-sm hover:bg-elev">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 p-4 pb-24 pt-[7.25rem] md:p-8 lg:pt-8">{children}</div>
      </div>
    </div>
  );
}
