"use client";
import { portalNext } from "@/lib/portal-auth";
import { PENDING_BOOKING_KEY, resumeHrefFromPendingJson } from "@/lib/nav-history";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Store, User } from "lucide-react";
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
  defaultNext,
  initialAsShop = false
}: {
  portal: "customer" | "vendor" | "admin";
  title: string;
  subtitle: string;
  defaultNext: string;
  initialAsShop?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState(defaultNext);
  const [asVendor, setAsVendor] = useState(portal === "vendor" && !initialAsShop);
  const [asShop, setAsShop] = useState(initialAsShop);
  const split = portal !== "admin";
  const expect = split ? (asVendor || asShop ? "vendor" : "customer") : "admin";
  const heading = split
    ? asShop
      ? "Product Seller Sign In"
      : asVendor
        ? "Service Provider Sign In"
        : "Customer Sign In"
    : title;
  const sub = split
    ? asShop
      ? "Sign in to manage your Shop store, products and orders."
      : asVendor
        ? "Sign in to manage services, bookings and earnings."
        : "Sign in to book treatments and manage your appointments."
    : subtitle;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
    const shop = params.get("asShop") === "1";
    setAsShop(shop);
    if (shop) setAsVendor(false);
    const fromQuery = params.get("next");
    const pending = resumeHrefFromPendingJson(sessionStorage.getItem(PENDING_BOOKING_KEY));
    setNext(fromQuery || (shop ? "/vendor/shop/onboarding" : !asVendor && pending) || defaultNext);
  }, [asVendor, defaultNext]);

  const pickKind = (kind: "customer" | "vendor" | "shop") => {
    setAsVendor(kind === "vendor");
    setAsShop(kind === "shop");
    const params = new URLSearchParams(window.location.search);
    params.delete("asShop");
    if (kind === "shop") params.set("asShop", "1");
    const q = params.toString();
    const path = kind === "customer" ? "/login" : "/login/vendor";
    router.replace(q ? `${path}?${q}` : path, { scroll: false });
  };

  const pick = (vendor: boolean) => pickKind(vendor ? "vendor" : "customer");

  const registerHref = asShop
    ? `/register?asShop=1${next ? `&next=${encodeURIComponent(next)}` : ""}`
    : asVendor
      ? `/register?asVendor=1${next ? `&next=${encodeURIComponent(next)}` : ""}`
      : `/register${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthScreen>
      <AuthHeading title={heading} subtitle={sub} />
      {split ? (
        <>
          <AccountTypeCards asVendor={asVendor} asShop={asShop} onChange={pick} onKindChange={pickKind} />
          <AuthHint icon={asShop ? ShoppingBag : asVendor ? Store : User}>
            {asShop
              ? "Sign in as a product seller to list items on Shop. This is not a spa or treatment listing."
              : asVendor
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
            const requested = new URLSearchParams(window.location.search).get("next");
            const dest = asShop
              ? json.home || "/vendor/shop"
              : requested || json.home || (asVendor ? "/vendor/dashboard" : defaultNext);
            const pending = expect === "customer" ? resumeHrefFromPendingJson(sessionStorage.getItem(PENDING_BOOKING_KEY)) : null;
            window.location.assign(portalNext(pending || dest, expect));
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
          {busy
            ? "Signing in…"
            : split
              ? asShop
                ? "Sign in as Product Seller"
                : asVendor
                  ? "Sign in as Service Provider"
                  : "Sign in as Customer"
              : "Sign in"}
        </button>
      </form>

      <div className="mt-6">
        <GoogleAuthButton
          portal={expect}
          next={asShop ? "/vendor/shop/onboarding" : next}
          from="login"
          label={expect === "admin" ? "Continue with Gmail" : "Continue with Google"}
        />
      </div>

      {split ? (
        <p className="mt-6 text-center text-sm text-ink2">
          Don&apos;t have an account?{" "}
          <Link href={registerHref} className="font-semibold text-ink">
            Create account
          </Link>
        </p>
      ) : null}
      <p className="mt-3 text-center text-sm">
        <Link
          href={expect === "customer" ? "/forgot" : `/forgot?portal=${expect}`}
          className="text-ink2 underline decoration-line underline-offset-2"
        >
          Forgot password
        </Link>
        {expect === "customer" ? (
          <>
            {" · "}
            <Link
              href={`/find-bookings${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-ink2 underline decoration-line underline-offset-2"
            >
              Find a guest booking
            </Link>
          </>
        ) : null}
      </p>
      {!split ? (
        <p className="mt-8 text-center text-xs text-ink2">
          <Link href="/">NaijaSpa home</Link>
          {" · "}
          <Link href="/login">Customer</Link>
          {" · "}
          <Link href="/login/vendor">Service Provider</Link>
          {" · "}
          <Link href="/login/vendor?asShop=1">Product Seller</Link>
        </p>
      ) : null}
    </AuthScreen>
  );
}
