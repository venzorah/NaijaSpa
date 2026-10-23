"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteSetupPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">Set your password</h1>
      <p className="text-sm text-ink2">Admin invites never include a default password.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/vendor/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password: fd.get("password") })
          });
          const json = await res.json();
          if (!res.ok) setError(json.error);
          else router.push("/vendor/onboarding");
        }}
      >
        <input name="password" type="password" minLength={10} required className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold">Activate account</button>
      </form>
    </div>
  );
}
