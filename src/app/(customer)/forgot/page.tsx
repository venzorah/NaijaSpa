import { Suspense } from "react";
import { ForgotForm } from "@/components/forgot-form";

export default function ForgotPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-sm text-ink2">Loading…</div>}>
      <ForgotForm />
    </Suspense>
  );
}
