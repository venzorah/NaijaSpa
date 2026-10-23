import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminRole(user.role)) redirect("/account");
  const links = [
    ["/admin", "Dashboard"],
    ["/admin/users", "Customers"],
    ["/admin/vendors", "Vendors"],
    ["/admin/bookings", "Bookings"],
    ["/admin/finance", "Finance"],
    ["/admin/commercial", "Commercial"],
    ["/admin/campaigns", "Campaigns"],
    ["/admin/cms", "CMS"],
    ["/admin/support", "Support"],
    ["/admin/ai", "AI"],
    ["/admin/audit", "Audit"]
  ];
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="hidden w-64 border-r border-line bg-bg2 p-4 lg:block">
        <p className="text-sm font-semibold">
          Naija<span className="text-goldink">Spa</span> Admin
        </p>
        <p className="text-[11px] text-ink2">{user.role}</p>
        <nav className="mt-6 grid gap-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl px-3 py-2 text-sm hover:bg-elev">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}
