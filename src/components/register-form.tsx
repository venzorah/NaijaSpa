"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, ShoppingBag, Store, User } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { portalNext } from "@/lib/portal-auth";
import { PENDING_BOOKING_KEY, resumeHrefFromPendingJson } from "@/lib/nav-history";
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
  const [asVendor, setAsVendor] = useState(search.get("asVendor") === "1" && search.get("asShop") !== "1");
  const [asShop, setAsShop] = useState(search.get("asShop") === "1");
  const [error, setError] = useState(search.get("error") || "");
  const [busy, setBusy] = useState(false);
  const portal = asVendor || asShop ? "vendor" : "customer";
  const requested = search.get("next");
  const dest = asShop ? "/vendor/shop/onboarding" : asVendor ? "/vendor/onboarding" : portalNext(requested, "customer");
  const [pendingResume, setPendingResume] = useState<string | null>(null);
  useEffect(() => {
    setPendingResume(resumeHrefFromPendingJson(sessionStorage.getItem(PENDING_BOOKING_KEY)));
  }, []);
  const afterAuth = asVendor || asShop ? dest : pendingResume || dest;
  const returnNext = asVendor || asShop ? requested : requested || pendingResume;

  const pickKind = (kind: "customer" | "vendor" | "shop") => {
    setAsVendor(kind === "vendor");
    setAsShop(kind === "shop");
    const params = new URLSearchParams();
    if (kind === "vendor") params.set("asVendor", "1");
    if (kind === "shop") params.set("asShop", "1");
    if (requested) params.set("next", requested);
    const q = params.toString();
    router.replace(`/register${q ? `?${q}` : ""}`, { scroll: false });
  };
  const pick = (vendor: boolean) => pickKind(vendor ? "vendor" : "customer");

  return (
    <AuthScreen>
      <AuthHeading
        title={asShop ? "Product Seller Sign Up" : asVendor ? "Service Provider Sign Up" : "Customer Sign Up"}
        subtitle="Join Nigeria's beauty, grooming and wellness community."
      />
      <AccountTypeCards asVendor={asVendor} asShop={asShop} onChange={pick} onKindChange={pickKind} />
      <AuthHint icon={asShop ? ShoppingBag : asVendor ? Store : User}>
        {asShop
          ? "Create a product seller account, then finish store setup: business details, KYC, store images and listings."
          : asVendor
          ? "Create a service provider account to showcase your services, attract customers and grow on NaijaSpa."
          : guestUpgrade
            ? "Keep every guest booking and chat on this email, then add a password for next time."
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
            const res = await fetch(guestUpgrade && !asVendor && !asShop ? "/api/account/upgrade" : "/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                guestUpgrade && !asVendor && !asShop
                  ? { email: fd.get("email"), password: fd.get("password") }
                  : { name, email: fd.get("email"), password: fd.get("password"), asVendor: asVendor || asShop, asShop }
              )
            });
            const json = await res.json();
            if (!res.ok) setError(json.error);
            else window.location.assign(afterAuth);
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
          {busy ? "Creating…" : asShop ? "Create Product Seller Account" : asVendor ? "Create Service Provider Account" : "Create Customer Account"}
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
        <GoogleAuthButton portal={portal} next={afterAuth} from="register" label="Continue with Google" />
      </div>

      <p className="mt-6 pb-2 text-center text-sm text-ink2">
        Already have an account?{" "}
        <Link
          href={`${asShop ? "/login/vendor?asShop=1" : asVendor ? "/login/vendor" : "/login"}${returnNext ? `${asShop ? "&" : "?"}next=${encodeURIComponent(returnNext)}` : ""}`}
          className="font-semibold text-ink"
        >
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
