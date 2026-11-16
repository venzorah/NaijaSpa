"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AccountTypeCards,
  AuthHeading,
  AuthLabel,
  AuthPassword,
  AuthScreen,
  authCtaClass,
  authFieldClass
} from "@/components/auth-screen";
type ResetPortal = "customer" | "vendor" | "admin";
const RESEND_SECONDS = 60;

function portalFromSearch(raw: string | null): ResetPortal {
  if (raw === "vendor" || raw === "admin") return raw;
  return "customer";
}

function loginHref(portal: ResetPortal) {
  if (portal === "vendor") return "/login/vendor";
  if (portal === "admin") return "/login/admin";
  return "/login";
}

export function ForgotForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [portal, setPortal] = useState<ResetPortal>(() => portalFromSearch(search.get("portal")));
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(() => search.get("email")?.trim() || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const split = portal !== "admin";
  const signInHref = loginHref(portal);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  function setPortalAndUrl(next: ResetPortal) {
    setPortal(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "customer") params.delete("portal");
    else params.set("portal", next);
    const q = params.toString();
    router.replace(`/forgot${q ? `?${q}` : ""}`, { scroll: false });
  }

  async function sendCode(address: string) {
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not send a code.");
    setWait(RESEND_SECONDS);
    return json.message as string;
  }

  const heading =
    portal === "vendor"
      ? { title: "Vendor password recovery", subtitle: "We'll email a 6-digit code if this service provider account exists. Enter it on this screen." }
      : portal === "admin"
        ? { title: "Admin password recovery", subtitle: "We'll email a 6-digit code if this admin account exists. Enter it on this screen." }
        : { title: "Password recovery", subtitle: "We'll email a 6-digit code if this customer account exists. Enter it on this screen." };

  if (step === "otp") {
    return (
      <AuthScreen>
        <AuthHeading
          title="Enter your code"
          subtitle={`We sent a 6-digit code to ${email}. Enter it here, then choose a new password.`}
        />
        <form
          key="otp-form"
          className="mt-8 space-y-4"
          autoComplete="off"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const fd = new FormData(e.currentTarget);
            try {
              const res = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  otp: fd.get("otp"),
                  password: fd.get("password")
                })
              });
              const json = await res.json();
              if (!res.ok) setError(json.error || "Could not reset password.");
              else router.replace(signInHref);
            } catch {
              setError("Could not reset password. Check your connection.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <AuthLabel htmlFor="otp">6-digit code</AuthLabel>
            <input type="text" name="username" value={email} readOnly tabIndex={-1} autoComplete="username" className="sr-only" aria-hidden />
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              required
              placeholder="6-digit code"
              className={`${authFieldClass} tracking-[0.35em] text-center text-lg`}
            />
          </div>
          <div>
            <AuthLabel htmlFor="password">New password</AuthLabel>
            <AuthPassword name="password" autoComplete="new-password" />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button className={authCtaClass} disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-ink2">
          {wait > 0 ? (
            <>Resend code in {wait}s</>
          ) : (
            <button
              type="button"
              className="font-semibold text-ink underline decoration-line underline-offset-2"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await sendCode(email);
                  setMsg("We sent a new code.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not send a code.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Resend code
            </button>
          )}
        </p>
        {msg ? <p className="mt-2 text-center text-sm text-ink2">{msg}</p> : null}
        <p className="mt-6 text-center text-sm text-ink2">
          <button type="button" className="font-semibold text-ink" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </p>
        <p className="mt-4 text-center text-sm text-ink2">
          <Link href={signInHref} className="font-semibold text-ink">
            Sign in
          </Link>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthHeading title={heading.title} subtitle={heading.subtitle} />
      {split ? (
        <AccountTypeCards asVendor={portal === "vendor"} onChange={(vendor) => setPortalAndUrl(vendor ? "vendor" : "customer")} />
      ) : (
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-goldink">Admin</p>
      )}
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          const address = String(fd.get("email") || "").trim().toLowerCase();
          try {
            await sendCode(address);
            setEmail(address);
            setStep("otp");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send a code.");
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
            required
            defaultValue={email}
            autoComplete="email"
            placeholder="Enter your email"
            className={authFieldClass}
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className={authCtaClass} disabled={busy}>
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink2">
        <Link href={signInHref} className="font-semibold text-ink">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
