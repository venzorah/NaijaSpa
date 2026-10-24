import { requireAdminScreen } from "@/lib/admin-auth";
import { ADMIN_PERMISSION_ROWS, ADMIN_ROLE_LABELS } from "@/lib/admin";
import { hasPermission, isAdminRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { RolesConsole } from "@/components/admin/roles-console";

const ADMIN_ROLE_VALUES = [
  ROLES.SUPER_ADMIN,
  ROLES.OPERATIONS,
  ROLES.VERIFICATION,
  ROLES.SUPPORT,
  ROLES.FINANCE,
  ROLES.CONTENT,
  ROLES.MARKETING,
  ROLES.MODERATOR,
  ROLES.ANALYST
];

export default async function Page() {
  const { user, editable } = await requireAdminScreen("roles");
  const admins = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLE_VALUES] } },
    orderBy: { name: "asc" }
  });
  return (
    <div>
      <AdminPageHeader screen="roles" />
      <Panel title="Permission matrix" description="Live grants from the server role map. Super administrators can reassign existing admin accounts only — customers and vendors cannot be promoted here.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink2">
              <tr>
                <th className="px-3 py-2 font-medium">Area</th>
                <th className="px-3 py-2 font-medium">Action</th>
                {ADMIN_ROLE_VALUES.map((role) => (
                  <th key={role} className="px-2 py-2 font-medium">
                    {ADMIN_ROLE_LABELS[role]?.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_PERMISSION_ROWS.map((row) => (
                <tr key={`${row.area}-${row.action}`} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-ink2">{row.area}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  {ADMIN_ROLE_VALUES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      {hasPermission(role, row.permission) ? <span className="text-forest">●</span> : <span className="text-ink2">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-4">
        <RolesConsole
          editable={editable}
          selfId={user.id}
          admins={admins.filter((a) => isAdminRole(a.role)).map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role }))}
        />
      </div>
    </div>
  );
}
