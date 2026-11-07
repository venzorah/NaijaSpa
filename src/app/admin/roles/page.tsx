import { requireAdminScreen } from "@/lib/admin-auth";
import { getRoleDefinitions } from "@/lib/admin-role-store";
import { ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RolesConsole } from "@/components/admin/roles-console";

export default async function Page() {
  const { user } = await requireAdminScreen("roles");
  const roles = await getRoleDefinitions();
  const admins = await prisma.user.findMany({ where: { role: { in: roles.map(role => role.key) }, status: { not: "deleted" } }, select: { id: true, name: true, email: true, role: true, status: true }, orderBy: { name: "asc" } });
  return <div><AdminPageHeader screen="roles" /><RolesConsole roles={roles} admins={admins} editable={user.role === ROLES.SUPER_ADMIN} selfId={user.id} /></div>;
}
