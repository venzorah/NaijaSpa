"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-horizontal.png" alt="NaijaSpa" className="mx-auto h-16 object-contain" />
      <h1 className="mt-6 text-center font-display text-3xl">Welcome back</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") })
          });
          const json = await res.json();
          if (!res.ok) setError(json.error);
          else {
            const next = new URLSearchParams(window.location.search).get("next") || (json.role?.includes("admin") ? "/admin" : json.role?.includes("vendor") ? "/vendor" : "/account");
            router.push(next);
          }
        }}
      >
        <input name="email" type="email" required placeholder="Email" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        <input name="password" type="password" required placeholder="Password" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold">Log in</button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/register">Create account</Link> · <Link href="/forgot">Forgot password</Link>
      </p>
    </div>
  );
}
