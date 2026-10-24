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
  const [asVendor, setAsVendor] = useState(search.get("asVendor") === "1");
  const [error, setError] = useState(search.get("error") || "");
  const [busy, setBusy] = useState(false);
  const portal = asVendor ? "vendor" : "customer";
  const next = asVendor ? "/vendor/onboarding" : "/account";

  const pick = (vendor: boolean) => {
    setAsVendor(vendor);
    router.replace(vendor ? "/register?asVendor=1" : "/register", { scroll: false });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex justify-center">
        <BrandLogo className="h-[4.5rem] w-auto object-contain" />
      </div>
      <h1 className="mt-5 text-center font-display text-3xl">Create account</h1>
      <p className="mt-2 text-center text-sm text-ink2">
        {asVendor ? "List your spa and start taking bookings." : "Book treatments across Nigeria with Paystack."}
      </p>

      <div
        role="tablist"
        aria-label="Account type"
        className="mt-6 grid grid-cols-2 rounded-full border border-line bg-elev p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!asVendor}
          onClick={() => pick(false)}
          className={`min-h-11 rounded-full text-sm font-bold transition ${
            !asVendor ? "bg-gold text-ongold shadow-sm" : "text-ink2"
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={asVendor}
          onClick={() => pick(true)}
          className={`min-h-11 rounded-full text-sm font-bold transition ${
            asVendor ? "bg-gold text-ongold shadow-sm" : "text-ink2"
          }`}
        >
          Vendor
        </button>
      </div>

      <div className="mt-6">
        <GoogleAuthButton
          portal={portal}
          next={next}
          label={asVendor ? "Create vendor account with Gmail" : "Create customer account with Gmail"}
        />
      </div>
      <p className="my-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink2">or</p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          try {
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
          } catch {
            setError("Could not create account. Check your connection.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input name="name" required placeholder="Full name" className={fieldClass} />
        <input name="email" type="email" required placeholder="Email" className={fieldClass} />
        <input
          name="password"
          type="password"
          required
          minLength={10}
          placeholder="Password (10+ chars)"
          className={fieldClass}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-gold text-base font-bold text-ongold disabled:opacity-60"
        >
          {busy ? "Creating…" : asVendor ? "Create vendor account" : "Create customer account"}
        </button>
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
