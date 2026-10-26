import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/portal-login";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/google-auth";

export default async function CustomerLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([getSession(), searchParams]);
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (user) redirect(safeNext(next, "/"));
  return (
    <PortalLogin
      portal="customer"
      title="Welcome back"
      subtitle="Book treatments, manage appointments and pay with Paystack."
      defaultNext="/account"
    />
  );
}
