"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/shell";
import { GoogleAuthButton } from "@/components/google-auth-button";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none focus:border-forest";

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
    setNext(params.get("next") || defaultNext);
  }, [defaultNext]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex justify-center">
        <BrandLogo className="h-[4.5rem] w-auto object-contain" />
      </div>
      <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-goldink">{portal}</p>
      <h1 className="mt-2 text-center font-display text-3xl">{title}</h1>
      <p className="mt-2 text-center text-sm text-ink2">{subtitle}</p>
      {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
      <div className="mt-6">
        <GoogleAuthButton portal={portal} next={next} />
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
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: fd.get("email"),
                password: fd.get("password"),
                expect: portal
              })
            });
            const json = (await res.json()) as { error?: string; home?: string };
            if (!res.ok) {
              setError(json.error || "Could not log in.");
              return;
            }
            const next = new URLSearchParams(window.location.search).get("next") || json.home || defaultNext;
            router.push(next);
            router.refresh();
          } catch {
            setError("Could not log in. Check your connection.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input name="email" type="email" autoComplete="username" required placeholder="Email" className={fieldClass} />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
          className={fieldClass}
        />
        <button disabled={busy} className="min-h-12 w-full rounded-full bg-gold text-base font-bold text-ongold disabled:opacity-60">
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      {portal === "customer" ? (
        <p className="mt-4 text-center text-sm">
          <Link href="/register">Create account</Link> · <Link href="/forgot">Forgot password</Link>
        </p>
      ) : portal === "vendor" ? (
        <p className="mt-4 text-center text-sm">
          <Link href="/register?asVendor=1">Create account</Link> · <Link href="/forgot">Forgot password</Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot">Forgot password</Link>
        </p>
      )}
      <p className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold text-ink2">
        <Link href="/login" className={portal === "customer" ? "text-forest" : ""}>
          Customer
        </Link>
        <Link href="/login/vendor" className={portal === "vendor" ? "text-forest" : ""}>
          Vendor
        </Link>
        <Link href="/login/admin" className={portal === "admin" ? "text-forest" : ""}>
          Admin
        </Link>
      </p>
    </div>
  );
}
