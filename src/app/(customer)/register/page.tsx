import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const user = await getSession();
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-sm text-ink2">Loading…</div>}>
      <RegisterForm guestUpgrade={user?.role === "customer" && user.accountKind === "guest"} />
    </Suspense>
  );
}
