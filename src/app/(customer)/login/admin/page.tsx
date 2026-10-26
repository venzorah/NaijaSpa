import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/portal-login";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/google-auth";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([getSession(), searchParams]);
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (user) redirect(safeNext(next, "/admin/dashboard"));
  return (
    <PortalLogin
      portal="admin"
      title="Admin console"
      subtitle="Vendors, commercial rules, finance and support. Invite-only accounts."
      defaultNext="/admin/dashboard"
    />
  );
}
