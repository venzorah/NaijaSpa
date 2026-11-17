import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalNext } from "@/lib/portal-auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; asVendor?: string }>;
}) {
  const [user, sp] = await Promise.all([getSession(), searchParams]);
  if (user?.role === "customer" && user.accountKind !== "guest") {
    redirect(portalNext(typeof sp.next === "string" ? sp.next : null, "customer"));
  }
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-sm text-ink2">Loading…</div>}>
      <RegisterForm guestUpgrade={user?.role === "customer" && user.accountKind === "guest"} />
    </Suspense>
  );
}
