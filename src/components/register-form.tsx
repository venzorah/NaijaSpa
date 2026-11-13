"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Store, User } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import {
  AccountTypeCards,
  AuthHeading,
  AuthHint,
  AuthLabel,
  AuthOrDivider,
  AuthPassword,
  AuthScreen,
  AuthTextField,
  authGoldCtaClass
} from "@/components/auth-screen";

export function RegisterForm({ guestUpgrade = false }: { guestUpgrade?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const [asVendor, setAsVendor] = useState(search.get("asVendor") === "1");
  const [error, setError] = useState(search.get("error") || "");
  const [busy, setBusy] = useState(false);
  const portal = asVendor ? "vendor" : "customer";
  const next = asVendor ? "/vendor/onboarding" : "/account/dashboard";

  const pick = (vendor: boolean) => {
    setAsVendor(vendor);
    router.replace(vendor ? "/register?asVendor=1" : "/register", { scroll: false });
  };

  return (
    <AuthScreen>
      <AuthHeading
        title={asVendor ? "Service Provider Sign Up" : "Customer Sign Up"}
        subtitle="Join Nigeria's beauty, grooming and wellness community."
      />
      <AccountTypeCards asVendor={asVendor} onChange={pick} />
      <AuthHint icon={asVendor ? Store : User}>
        {asVendor
          ? "Create a service provider account to showcase your services, attract customers and grow on NaijaSpa."
          : guestUpgrade
            ? "Keep every guest booking and chat on this phone number, then add a password for next time."
            : "Create a customer account to book treatments, save favourites and enjoy wellness on NaijaSpa."}
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
            const res = await fetch(guestUpgrade && !asVendor ? "/api/account/upgrade" : "/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                guestUpgrade && !asVendor
                  ? { email: fd.get("email"), password: fd.get("password") }
                  : { name, email: fd.get("email"), password: fd.get("password"), asVendor }
              )
            });
            const json = await res.json();
            if (!res.ok) setError(json.error);
            else router.push(asVendor ? "/vendor/onboarding" : "/account/dashboard");
          } catch {
            setError("Could not create account. Check your connection.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {guestUpgrade ? null : (
        <div className="grid grid-cols-2 gap-3">
          <AuthTextField
            id="firstName"
            name="firstName"
            label="First Name"
            icon={User}
            required
            autoComplete="given-name"
            placeholder="Enter first name"
          />
          <AuthTextField
            id="lastName"
            name="lastName"
            label="Last Name"
            icon={User}
            required
            autoComplete="family-name"
            placeholder="Enter last name"
          />
        </div>
        )}
        <AuthTextField
          id="email"
          name="email"
          type="email"
          label="Email Address"
          icon={Mail}
          required
          autoComplete="email"
          placeholder="Enter your email address"
        />
        <div>
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <AuthPassword placeholder="Create a password (min. 10 characters)" />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button disabled={busy} className={authGoldCtaClass}>
          {busy ? "Creating…" : asVendor ? "Create Service Provider Account" : "Create Customer Account"}
          {busy ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-ink2">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-semibold text-forest underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-forest underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      <AuthOrDivider />

      <div className="mt-4">
        <GoogleAuthButton portal={portal} next={next} from="register" label="Continue with Google" />
      </div>

      <p className="mt-6 pb-2 text-center text-sm text-ink2">
        Already have an account?{" "}
        <Link href={asVendor ? "/login/vendor" : "/login"} className="font-semibold text-ink">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
