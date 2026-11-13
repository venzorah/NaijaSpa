import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, requireUser, type SessionUser } from "@/lib/auth";
import { accessForScreen, type AdminScreenId } from "@/lib/admin";
import { assertAnyPermission, isAdminRole, type Permission } from "@/lib/rbac";
import { portalNext } from "@/lib/portal-auth";

export async function requireAdmin(permissions: Permission | Permission[] = "admin.access"): Promise<SessionUser> {
  const user = requireUser(await getSession());
  if (!isAdminRole(user)) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const list = Array.isArray(permissions) ? permissions : [permissions];
  assertAnyPermission(user, list);
  return user;
}

export async function requireAdminScreen(screen: AdminScreenId) {
  const user = await getSession();
  if (!user) {
    const next = portalNext((await headers()).get("x-naijaspa-admin-path"), "admin");
    redirect(`/login/admin?${new URLSearchParams({ next })}`);
  }
  if (!isAdminRole(user)) redirect("/account/dashboard");
  const access = accessForScreen(user, screen);
  if (!access) redirect("/admin/dashboard");
  return { user, editable: access === "full" };
}
