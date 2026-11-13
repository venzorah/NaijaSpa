"use client";

import { useState } from "react";
import { GoldButton } from "@/components/gold-button";

const field = "mt-1 h-12 w-full rounded-xl border border-line bg-bg2 px-3 text-ink";

export function ClaimGuestBookings({ defaultPhone }: { defaultPhone: string }) {
  const [phone, setPhone] = useState(defaultPhone);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, sendCode: true })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send the code.");
      setSent(true);
      setMessage("If that number has guest bookings, a code was sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not claim bookings.");
      setMessage(json.claimed ? "Guest bookings were moved to this account." : "Phone verified. No guest bookings were waiting.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not claim bookings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-3xl border border-line bg-card p-5">
      <h2 className="font-semibold text-ink">Guest bookings</h2>
      <p className="mt-1 text-sm text-ink2">
        Booked before creating this account? Verify the phone number to move those bookings here.
      </p>
      <div className="mt-3 grid gap-3">
        <label className="text-sm text-ink2">
          Phone number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={field} />
        </label>
        {sent ? (
          <label className="text-sm text-ink2">
            Verification code
            <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" className={field} />
          </label>
        ) : null}
        {message ? <p className="text-sm text-ink2">{message}</p> : null}
        <div>
          {!sent ? (
            <GoldButton type="button" disabled={busy || !phone.trim()} onClick={() => void sendCode()}>
              {busy ? "Sending…" : "Send code"}
            </GoldButton>
          ) : (
            <GoldButton type="button" disabled={busy || otp.trim().length < 4} onClick={() => void claim()}>
              {busy ? "Claiming…" : "Claim bookings"}
            </GoldButton>
          )}
        </div>
      </div>
    </section>
  );
}
