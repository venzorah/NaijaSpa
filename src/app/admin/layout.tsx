import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { ADMIN_ROLE_LABELS } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PortalChrome } from "@/components/portal-chrome";
import { portalNext } from "@/lib/portal-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  const next = portalNext((await headers()).get("x-naijaspa-admin-path"), "admin");
  if (!user) redirect(`/login/admin?${new URLSearchParams({ next })}`);
  if (!isAdminRole(user)) redirect("/account/dashboard");
  const openTickets = await prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }).catch(() => 0);
  return (
    <PortalChrome
      variant="admin"
      title="Admin"
      subtitle={user.roleLabel ?? ADMIN_ROLE_LABELS[user.role] ?? user.role}
      userName={user.name}
      role={{ role: user.role, permissions: user.permissions }}
      alerts={openTickets}
    >
      {children}
    </PortalChrome>
  );
}
