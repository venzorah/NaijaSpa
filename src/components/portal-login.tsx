"use client";
import { portalNext } from "@/lib/portal-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, User } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import {
  AccountTypeCards,
  AuthHeading,
  AuthHint,
  AuthLabel,
  AuthPassword,
  AuthScreen,
  authCtaClass,
  authFieldClass
} from "@/components/auth-screen";

export function PortalLogin({
  portal,
  title,
  subtitle,
  defaultNext
}: {
  portal: "customer" | "vendor" | "admin";
  title: string;
  subtitle: string;
  defaultNext: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState(defaultNext);
  const [asVendor, setAsVendor] = useState(portal === "vendor");
  const split = portal !== "admin";
  const expect = split ? (asVendor ? "vendor" : "customer") : "admin";
  const heading = split ? (asVendor ? "Service Provider Sign In" : "Customer Sign In") : title;
  const sub = split
    ? asVendor
      ? "Sign in to manage services, bookings and earnings."
      : "Sign in to book treatments and manage your appointments."
    : subtitle;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
    setNext(params.get("next") || defaultNext);
  }, [defaultNext]);

  const pick = (vendor: boolean) => {
    setAsVendor(vendor);
    const params = new URLSearchParams(window.location.search);
    const q = params.toString();
    router.replace((vendor ? "/login/vendor" : "/login") + (q ? `?${q}` : ""), { scroll: false });
  };

  return (
    <AuthScreen>
      <AuthHeading title={heading} subtitle={sub} />
      {split ? (
        <>
          <AccountTypeCards asVendor={asVendor} onChange={pick} />
          <AuthHint icon={asVendor ? Store : User}>
            {asVendor
              ? "Sign in as a service provider to manage services, galleries, bookings and earnings."
              : "Sign in as a customer to book treatments, manage appointments and pay with Paystack."}
          </AuthHint>
        </>
      ) : (
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-goldink">Admin</p>
      )}
      {error ? <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: fd.get("email"),
                password: fd.get("password"),
                expect
              })
            });
            const json = (await res.json()) as { error?: string; home?: string };
            if (!res.ok) {
              setError(json.error || "Could not log in.");
              return;
            }
            const dest = new URLSearchParams(window.location.search).get("next") || json.home || (asVendor ? "/vendor/dashboard" : defaultNext);
            window.location.assign(portalNext(dest, expect));
            router.refresh();
          } catch {
            setError("Could not log in. Check your connection.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <AuthLabel htmlFor="email">Email Address</AuthLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="Enter your email"
            className={authFieldClass}
          />
        </div>
        <div>
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <AuthPassword autoComplete="current-password" minLength={1} placeholder="Enter your password" />
        </div>
        <button disabled={busy} className={authCtaClass}>
          {busy ? "Signing in…" : split ? (asVendor ? "Sign in as Service Provider" : "Sign in as Customer") : "Sign in"}
        </button>
      </form>

      <div className="mt-6">
        <GoogleAuthButton
          portal={expect}
          next={next}
          from="login"
          label={expect === "admin" ? "Continue with Gmail" : "Continue with Google"}
        />
      </div>

      {split ? (
        <p className="mt-6 text-center text-sm text-ink2">
          Don&apos;t have an account?{" "}
          <Link href={asVendor ? "/register?asVendor=1" : "/register"} className="font-semibold text-ink">
            Create account
          </Link>
        </p>
      ) : null}
      <p className="mt-3 text-center text-sm">
        <Link href="/forgot" className="text-ink2 underline decoration-line underline-offset-2">
          Forgot password
        </Link>
      </p>
      {!split ? (
        <p className="mt-8 text-center text-xs text-ink2">
          <Link href="/">NaijaSpa home</Link>
          {" · "}
          <Link href="/login">Customer</Link>
          {" · "}
          <Link href="/login/vendor">Service Provider</Link>
        </p>
      ) : null}
    </AuthScreen>
  );
}
