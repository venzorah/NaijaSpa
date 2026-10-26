"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";
import {
  AuthHeading,
  AuthHint,
  AuthLabel,
  AuthPassword,
  AuthScreen,
  RoleSwitch,
  authCtaClass,
  authFieldClass
} from "@/components/auth-screen";

export function RegisterForm() {
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
    <AuthScreen>
      <AuthHeading title="Create Account" subtitle="Join our exclusive wellness community." />
      <RoleSwitch asVendor={asVendor} onChange={pick} />
      <AuthHint>
        {asVendor
          ? "Create a spa therapist account to list your services, take bookings, and grow your studio."
          : "Create a client account to browse therapists, book sessions, and access exclusive VIP experiences."}
      </AuthHint>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          const name = `${String(fd.get("firstName") || "").trim()} ${String(fd.get("lastName") || "").trim()}`.trim();
          try {
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <AuthLabel htmlFor="firstName">First Name</AuthLabel>
            <input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              placeholder="First Name"
              className={authFieldClass}
            />
          </div>
          <div>
            <AuthLabel htmlFor="lastName">Last Name</AuthLabel>
            <input
              id="lastName"
              name="lastName"
              required
              autoComplete="family-name"
              placeholder="Last Name"
              className={authFieldClass}
            />
          </div>
        </div>
        <div>
          <AuthLabel htmlFor="email">Email Address</AuthLabel>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            className={authFieldClass}
          />
        </div>
        <div>
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <AuthPassword />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button disabled={busy} className={authCtaClass}>
          {busy ? "Creating…" : asVendor ? "Create Therapist Account" : "Create Client Account"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-ink2">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-semibold text-ink underline decoration-line underline-offset-2">
          Terms
        </Link>{" "}
        &{" "}
        <Link href="/privacy" className="font-semibold text-ink underline decoration-line underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      <div className="mt-6">
        <GoogleAuthButton
          portal={portal}
          next={next}
          from="register"
          label={asVendor ? "Create therapist account with Gmail" : "Create client account with Gmail"}
        />
      </div>

      <p className="mt-6 text-center text-sm text-ink2">
        Already have an account?{" "}
        <Link href={asVendor ? "/login/vendor" : "/login"} className="font-semibold text-ink">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
