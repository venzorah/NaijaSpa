import { redirect } from "next/navigation";
import { getSession, requireUser, type SessionUser } from "@/lib/auth";
import { accessForScreen, type AdminScreenId } from "@/lib/admin";
import { assertAnyPermission, isAdminRole, type Permission } from "@/lib/rbac";

export async function requireAdmin(permissions: Permission | Permission[] = "admin.access"): Promise<SessionUser> {
  const user = requireUser(await getSession());
  if (!isAdminRole(user.role)) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const list = Array.isArray(permissions) ? permissions : [permissions];
  assertAnyPermission(user.role, list);
  return user;
}

export async function requireAdminScreen(screen: AdminScreenId) {
  const user = await getSession();
  if (!user) redirect("/login/admin?next=/admin");
  if (!isAdminRole(user.role)) redirect("/account");
  const access = accessForScreen(user.role, screen);
  if (!access) redirect("/admin");
  return { user, editable: access === "full" };
}
