import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/vendor");
  if (!["vendor_owner", "vendor_staff"].includes(user.role)) redirect("/account");
  const links = [
    ["/vendor", "Dashboard"],
    ["/vendor/services", "Services"],
    ["/vendor/bookings", "Bookings"],
    ["/vendor/subscriptions", "Subscriptions"],
    ["/vendor/earnings", "Earnings"],
    ["/vendor/onboarding", "Onboarding"],
    ["/vendor/settings", "Settings"]
  ];
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="hidden w-64 border-r border-line bg-bg2 p-4 lg:block">
        <Link href="/vendor" aria-label="NaijaSpa vendor home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal.png" alt="NaijaSpa" className="h-12 w-auto max-w-full object-contain object-left" />
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
      <div className="flex-1 p-4 pb-24 md:p-8">{children}</div>
    </div>
  );
}
