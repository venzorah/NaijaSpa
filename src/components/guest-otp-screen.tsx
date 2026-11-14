"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, Smartphone } from "lucide-react";
import {
  AuthHeading,
  AuthHint,
  AuthLabel,
  AuthScreen,
  authFieldClass,
  authGoldCtaClass
} from "@/components/auth-screen";
import { maskEmail, maskNgPhone, normalizeGuestEmail, normalizeNgPhone } from "@/lib/phone";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const PHONE_KEY = "naijaspa-guest-otp-phone";
const EMAIL_KEY = "naijaspa-guest-otp-email";

function apiError(json: { error?: string }, fallback: string) {
  const msg = json.error?.trim() || "";
  if (!msg || msg.length > 160 || /TURBOPACK|__imported__module__/i.test(msg)) return fallback;
  return msg;
}

function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function recalled(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function GuestOtpRequestScreen() {
  const router = useRouter();
  const [channel, setChannel] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedPhone = recalled(PHONE_KEY);
    const savedEmail = recalled(EMAIL_KEY);
    if (savedPhone) setPhone(savedPhone);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (channel === "phone") {
        if (!normalizeNgPhone(phone)) throw new Error("Enter a valid Nigerian mobile number.");
      } else if (!normalizeGuestEmail(email)) {
        throw new Error("Enter the email used at guest checkout.");
      }
      const res = await fetch("/api/guest/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channel === "phone" ? { phone } : { email: email.trim().toLowerCase() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiError(json, "Could not send a code."));
      if (channel === "phone") {
        remember(PHONE_KEY, phone.trim());
        router.push(`/find-bookings/verify?phone=${encodeURIComponent(phone.trim())}`);
      } else {
        const next = email.trim().toLowerCase();
        remember(EMAIL_KEY, next);
        router.push(`/find-bookings/verify?email=${encodeURIComponent(next)}`);
      }
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
        subtitle="Use the Nigerian mobile number or the email from guest checkout. We send a 6-digit code. Bookings stay hidden until the code is verified."
      />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setChannel("phone")}
          className={`min-h-11 rounded-2xl border text-sm font-semibold ${channel === "phone" ? "border-forest bg-forest/10 text-ink" : "border-line text-ink2"}`}
        >
          Phone
        </button>
        <button
          type="button"
          onClick={() => setChannel("email")}
          className={`min-h-11 rounded-2xl border text-sm font-semibold ${channel === "email" ? "border-forest bg-forest/10 text-ink" : "border-line text-ink2"}`}
        >
          Email
        </button>
      </div>
      <AuthHint icon={channel === "email" ? Mail : Smartphone}>
        {channel === "email"
          ? "Use the same email from guest checkout. If you skipped email then, verify with your phone instead."
          : "Guest checkout does not need an account. Verify this phone to open paid bookings and chat."}
      </AuthHint>
      <form className="mt-6 space-y-4" onSubmit={(e) => void requestCode(e)}>
        {channel === "phone" ? (
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
        ) : (
          <div>
            <AuthLabel htmlFor="guest-email">Email</AuthLabel>
            <input
              id="guest-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClass}
            />
          </div>
        )}
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

export function GuestOtpVerifyScreen({ phone = "", email = "" }: { phone?: string; email?: string }) {
  const router = useRouter();
  const viaEmail = Boolean(email.trim());
  const resolvedPhone = phone.trim();
  const resolvedEmail = email.trim().toLowerCase();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (viaEmail) {
      if (!normalizeGuestEmail(resolvedEmail)) {
        router.replace("/find-bookings");
        return;
      }
      remember(EMAIL_KEY, resolvedEmail);
      return;
    }
    if (!normalizeNgPhone(resolvedPhone)) {
      router.replace("/find-bookings");
      return;
    }
    remember(PHONE_KEY, resolvedPhone);
  }, [viaEmail, resolvedEmail, resolvedPhone, router]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const payload = viaEmail ? { email: resolvedEmail } : { phone: resolvedPhone };

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, otp })
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
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiError(json, "Could not send a code."));
      setWait(RESEND_SECONDS);
      setMsg(
        viaEmail
          ? "If this email has guest bookings, a new code was sent."
          : "If this number has guest bookings, a new code was sent."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeading
        title={viaEmail ? "Verify your email" : "Verify your phone"}
        subtitle={`Enter the 6-digit code sent to ${viaEmail ? maskEmail(resolvedEmail) : maskNgPhone(resolvedPhone)}. It expires in 15 minutes.`}
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
          {viaEmail ? "Use a different email or phone" : "Use a different number"}
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

export { GuestOtpRequestScreen as GuestPhoneRequestScreen, GuestOtpVerifyScreen as GuestPhoneVerifyScreen };
