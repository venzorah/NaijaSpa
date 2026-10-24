import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { PortalChrome } from "@/components/portal-chrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login/admin?next=/admin");
  if (!isAdminRole(user.role)) redirect("/account");
  return (
    <PortalChrome variant="admin" title="Admin" subtitle={`Admin · ${user.role}`} userName={user.name}>
      {children}
    </PortalChrome>
  );
}
