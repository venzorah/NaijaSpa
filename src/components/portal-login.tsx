"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const heading = split ? "Welcome Back" : title;
  const sub = split ? "Sign in to your wellness account." : subtitle;

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
          <RoleSwitch asVendor={asVendor} onChange={pick} />
          <AuthHint>
            {asVendor
              ? "Sign in as a spa therapist to manage services, galleries, bookings and earnings."
              : "Sign in as a client to book sessions, manage appointments and pay with Paystack."}
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
            router.replace(dest.startsWith("/") && !dest.startsWith("//") ? dest : defaultNext);
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
          {busy ? "Signing in…" : split ? (asVendor ? "Sign in as Therapist" : "Sign in as Client") : "Sign in"}
        </button>
      </form>

      <div className="mt-6">
        <GoogleAuthButton
          portal={expect}
          next={next}
          from="login"
          label={
            expect === "admin"
              ? "Continue with Gmail"
              : asVendor
                ? "Sign in with Gmail as therapist"
                : "Sign in with Gmail as client"
          }
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
      {split ? (
        <p className="mt-8 text-center text-xs text-ink2">
          <Link href="/login/admin">Admin sign in</Link>
        </p>
      ) : (
        <p className="mt-8 text-center text-xs text-ink2">
          <Link href="/">NaijaSpa home</Link>
          {" · "}
          <Link href="/login">Client</Link>
          {" · "}
          <Link href="/login/vendor">Therapist</Link>
        </p>
      )}
    </AuthScreen>
  );
}
