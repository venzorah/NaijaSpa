import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { ADMIN_ROLE_LABELS } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PortalChrome } from "@/components/portal-chrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login/admin?next=/admin/dashboard");
  if (!isAdminRole(user.role)) redirect("/account/dashboard");
  const openTickets = await prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }).catch(() => 0);
  return (
    <PortalChrome
      variant="admin"
      title="Admin"
      subtitle={ADMIN_ROLE_LABELS[user.role] ?? user.role}
      userName={user.name}
      role={user.role}
      alerts={openTickets}
    >
      {children}
    </PortalChrome>
  );
}
