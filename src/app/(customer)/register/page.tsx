import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-sm text-ink2">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
