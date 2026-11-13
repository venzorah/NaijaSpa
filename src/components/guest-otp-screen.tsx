"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Smartphone } from "lucide-react";
import {
  AuthHeading,
  AuthHint,
  AuthLabel,
  AuthScreen,
  authFieldClass,
  authGoldCtaClass
} from "@/components/auth-screen";
import { maskNgPhone, normalizeNgPhone } from "@/lib/phone";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function apiError(json: { error?: string }, fallback: string) {
  const msg = json.error?.trim() || "";
  if (!msg || msg.length > 160 || /TURBOPACK|__imported__module__/i.test(msg)) return fallback;
  return msg;
}

const PHONE_KEY = "naijaspa-guest-otp-phone";

function rememberPhone(phone: string) {
  try {
    sessionStorage.setItem(PHONE_KEY, phone);
  } catch {
    /* private mode */
  }
}

function recalledPhone() {
  try {
    return sessionStorage.getItem(PHONE_KEY) || "";
  } catch {
    return "";
  }
}

export function GuestPhoneRequestScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = recalledPhone();
    if (saved) setPhone(saved);
  }, []);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!normalizeNgPhone(phone)) throw new Error("Enter a valid Nigerian mobile number.");
      const res = await fetch("/api/guest/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiError(json, "Could not send a code."));
      rememberPhone(phone.trim());
      router.push(`/find-bookings/verify?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading
        title="Find guest bookings"
        subtitle="Enter the Nigerian mobile number used at checkout. We will send a 6-digit code. Booking details stay hidden until the code is verified."
      />
      <AuthHint icon={Smartphone}>
        Guest checkout does not need an account. Verify this phone to open paid bookings and chat.
      </AuthHint>
      <form className="mt-6 space-y-4" onSubmit={(e) => void requestCode(e)}>
        <div>
          <AuthLabel htmlFor="guest-phone">Phone number</AuthLabel>
          <input
            id="guest-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="0803 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={authFieldClass}
          />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button className={authGoldCtaClass} disabled={busy}>
          {busy ? "Sending…" : "Send verification code"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink2">
        Have an account?{" "}
        <Link href="/login?next=/account/bookings" className="font-semibold text-ink underline decoration-line underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}

function OtpBoxes({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);

  function setDigit(index: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      const next = `${digits.slice(0, index)}${digits.slice(index + 1)}`;
      onChange(next);
      return;
    }
    if (only.length > 1) {
      onChange(only.slice(0, OTP_LENGTH));
      refs.current[Math.min(only.length, OTP_LENGTH) - 1]?.focus();
      return;
    }
    const next = `${digits.slice(0, index)}${only}${digits.slice(index + 1)}`.slice(0, OTP_LENGTH);
    onChange(next);
    if (index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div role="group" aria-label="6-digit verification code" className="flex justify-between gap-1.5">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          id={i === 0 ? "guest-otp" : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={6}
          disabled={disabled}
          value={digits[i] || ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
              onChange(digits.slice(0, i - 1));
            }
          }}
          className="h-14 w-11 rounded-2xl border border-line bg-card text-center font-display text-2xl font-semibold text-ink outline-none focus:border-gold sm:h-16 sm:w-12"
        />
      ))}
    </div>
  );
}

export function GuestPhoneVerifyScreen({ phone }: { phone: string }) {
  const router = useRouter();
  const resolved = phone.trim() || recalledPhone();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!normalizeNgPhone(resolved)) {
      router.replace("/find-bookings");
      return;
    }
    rememberPhone(resolved);
  }, [resolved, router]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resolved, otp })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiError(json, "Invalid or expired code."));
      router.push("/account/bookings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (wait > 0 || busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/guest/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resolved })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiError(json, "Could not send a code."));
      setWait(RESEND_SECONDS);
      setMsg("If this number has guest bookings, a new code was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading
        title="Verify your phone"
        subtitle={`Enter the 6-digit code sent to ${maskNgPhone(resolved)}. It expires in 15 minutes.`}
      />
      <AuthHint icon={ShieldCheck}>
        We never show bookings, chat or payments until this code is confirmed.
      </AuthHint>
      <form className="mt-6 space-y-5" onSubmit={(e) => void verify(e)}>
        <div>
          <AuthLabel htmlFor="guest-otp">Verification code</AuthLabel>
          <OtpBoxes value={otp} onChange={setOtp} disabled={busy} />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {msg ? <p className="text-sm text-ink2">{msg}</p> : null}
        <button className={authGoldCtaClass} disabled={busy || otp.replace(/\D/g, "").length < OTP_LENGTH}>
          {busy ? "Checking…" : "View my bookings"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-ink2">
        {wait > 0 ? (
          <>Resend code in {wait}s</>
        ) : (
          <button type="button" className="font-semibold text-ink underline decoration-line underline-offset-2" onClick={() => void resend()} disabled={busy}>
            Resend code
          </button>
        )}
      </p>
      <p className="mt-4 text-center text-sm">
        <Link href="/find-bookings" className="font-semibold text-ink">
          Use a different number
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-ink2">
        Have an account?{" "}
        <Link href="/login?next=/account/bookings" className="font-semibold text-ink underline decoration-line underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
