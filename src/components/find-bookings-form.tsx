"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function FindBookingsForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send code.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not verify code.");
      router.push("/account/bookings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">My bookings</h1>
      <p className="mt-2 text-sm text-ink2">
        Enter the phone number used for your booking. We will send a one-time code. We never show booking details before the code is verified.
      </p>
      {!sent ? (
        <form className="mt-6 space-y-4" onSubmit={(e) => void requestCode(e)}>
          <label className="block text-sm font-semibold">
            Phone number
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3 font-normal" />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold disabled:opacity-60">
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => void verify(e)}>
          <p className="text-sm text-ink2">If this number has bookings, a code was sent.</p>
          <label className="block text-sm font-semibold">
            Verification code
            <input required value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3 font-normal tracking-[0.3em]" />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold disabled:opacity-60">
            {busy ? "Checking…" : "View my bookings"}
          </button>
          <button type="button" className="w-full text-sm font-semibold text-leaf" onClick={() => setSent(false)}>
            Use a different number
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-ink2">
        Have an account?{" "}
        <Link href="/login?next=/account/bookings" className="font-semibold text-leaf">
          Sign in
        </Link>
      </p>
    </div>
  );
}
