"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthHeading,
  AuthLabel,
  AuthPassword,
  AuthScreen,
  authCtaClass,
  authFieldClass
} from "@/components/auth-screen";

export default function ForgotPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(address: string) {
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not send a code.");
    return json.message as string;
  }

  if (step === "otp") {
    return (
      <AuthScreen>
        <AuthHeading
          title="Enter your code"
          subtitle={`We sent a 6-digit code to ${email}. Enter it here, then choose a new password.`}
        />
        <form
          className="mt-8 space-y-4"
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
              else router.replace("/login");
            } catch {
              setError("Could not reset password. Check your connection.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <AuthLabel htmlFor="otp">6-digit code</AuthLabel>
            <input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="000000"
              className={`${authFieldClass} tracking-[0.4em] text-center text-lg`}
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
        </p>
        {msg ? <p className="mt-2 text-center text-sm text-ink2">{msg}</p> : null}
        <p className="mt-6 text-center text-sm text-ink2">
          <button type="button" className="font-semibold text-ink" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthHeading title="Password recovery" subtitle="We'll email a 6-digit code if the account exists. Enter it in this screen." />
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          const address = String(fd.get("email") || "").trim();
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
        <Link href="/login" className="font-semibold text-ink">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
