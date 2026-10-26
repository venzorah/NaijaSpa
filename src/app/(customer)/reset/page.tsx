"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AuthHeading,
  AuthLabel,
  AuthPassword,
  AuthScreen,
  authCtaClass
} from "@/components/auth-screen";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthScreen>
        <AuthHeading title="Reset password" subtitle="This link is missing a token. Request a new one from password recovery." />
        <p className="mt-6 text-center text-sm text-ink2">
          <Link href="/forgot" className="font-semibold text-ink">
            Request a reset link
          </Link>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthHeading title="Set a new password" subtitle="Choose a password with at least 10 characters." />
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          try {
            const res = await fetch("/api/auth/reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password: fd.get("password") })
            });
            const json = await res.json();
            if (!res.ok) setError(json.error || "Could not reset password.");
            else router.replace("/login");
          } catch {
            setError("Could not reset password. Check your connection.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <AuthLabel htmlFor="password">New password</AuthLabel>
          <AuthPassword name="password" autoComplete="new-password" />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className={authCtaClass} disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthScreen>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
