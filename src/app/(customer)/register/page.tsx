"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/shell";
import { GoogleAuthButton } from "@/components/google-auth-button";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none focus:border-forest";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const asVendorDefault = search.get("asVendor") === "1";
  const [asVendor, setAsVendor] = useState(asVendorDefault);
  const [error, setError] = useState(search.get("error") || "");
  const portal = asVendor ? "vendor" : "customer";
  const next = asVendor ? "/vendor/onboarding" : "/account";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex justify-center">
        <BrandLogo className="h-[4.5rem] w-auto object-contain" />
      </div>
      <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-goldink">
        {asVendor ? "vendor" : "customer"}
      </p>
      <h1 className="mt-2 text-center font-display text-3xl">Create account</h1>
      <p className="mt-2 text-center text-sm text-ink2">
        {asVendor ? "List your spa and start taking bookings." : "Book treatments across Nigeria with Paystack."}
      </p>
      <div className="mt-6">
        <GoogleAuthButton portal={portal} next={next} label="Create account with Gmail" />
      </div>
      <p className="my-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink2">or</p>
      <form
        className="space-y-3"
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
              asVendor
            })
          });
          const json = await res.json();
          if (!res.ok) setError(json.error);
          else router.push(asVendor ? "/vendor/onboarding" : "/account");
        }}
      >
        <input name="name" required placeholder="Full name" className={fieldClass} />
        <input name="email" type="email" required placeholder="Email" className={fieldClass} />
        <input name="password" type="password" required minLength={10} placeholder="Password (10+ chars)" className={fieldClass} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="asVendor" checked={asVendor} onChange={(e) => setAsVendor(e.target.checked)} />
          Register as vendor
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="min-h-12 w-full rounded-full bg-gold text-base font-bold text-ongold">Create account</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account? <Link href={asVendor ? "/login/vendor" : "/login"}>Log in</Link>
      </p>
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
