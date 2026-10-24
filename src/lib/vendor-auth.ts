import { getSession, requireUser, type SessionUser } from "@/lib/auth";
import { isVendorRole } from "@/lib/rbac";

export async function requireVendor(): Promise<SessionUser & { vendorId: string }> {
  const user = requireUser(await getSession());
  if (!isVendorRole(user.role) || !user.vendorId) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return user as SessionUser & { vendorId: string };
}
