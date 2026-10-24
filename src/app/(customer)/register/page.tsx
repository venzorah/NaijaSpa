"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const asVendorDefault = search.get("asVendor") === "1";
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">Create account</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              email: fd.get("email"),
              password: fd.get("password"),
              asVendor: fd.get("asVendor") === "on"
            })
          });
          const json = await res.json();
          if (!res.ok) setError(json.error);
          else router.push(fd.get("asVendor") === "on" ? "/vendor/onboarding" : "/account");
        }}
      >
        <input name="name" required placeholder="Full name" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        <input name="email" type="email" required placeholder="Email" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        <input name="password" type="password" required minLength={10} placeholder="Password (10+ chars)" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="asVendor" defaultChecked={asVendorDefault} /> Register as vendor
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold">Create account</button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-sm text-ink2">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
