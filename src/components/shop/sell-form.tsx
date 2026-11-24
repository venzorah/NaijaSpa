"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLabel, AuthPassword } from "@/components/auth-screen";
import { notifyAction } from "@/lib/action-feedback";

export function SellOnShop({ canActivate }: { states: string[]; canActivate: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"activate" | "register">(canActivate ? "activate" : "register");
  return (
    <form
      className="mt-8 grid gap-3 rounded-[1.75rem] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const fd = new FormData(e.currentTarget);
        const payload = Object.fromEntries(fd.entries());
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch("/api/shop/vendor/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, ...payload })
          });
          const data = await res.json();
          if (!res.ok) {
            setMessage(data.error || "Could not continue");
            notifyAction("error", data.error || "Could not continue");
            setBusy(false);
            return;
          }
          notifyAction("success", "Account ready. Continue store setup.");
          window.location.assign(data.home || "/vendor/shop/onboarding");
        } catch {
          setMessage("Could not continue. Check your connection.");
          notifyAction("error", "Could not continue. Check your connection.");
          setBusy(false);
        }
      }}
    >
      {canActivate ? (
        <label className="text-sm">
          <input type="radio" checked={mode === "activate"} onChange={() => setMode("activate")} /> Activate Product Store on my existing vendor account
        </label>
      ) : null}
      <label className="text-sm">
        <input type="radio" checked={mode === "register"} onChange={() => setMode("register")} /> Register as a product-only seller
      </label>
      {mode === "register" ? (
        <>
          <input required name="name" placeholder="Your name" className="h-11 rounded-2xl border border-line px-3" />
          <input required type="email" name="email" placeholder="Email" className="h-11 rounded-2xl border border-line px-3" />
          <div>
            <AuthLabel htmlFor="password">Password</AuthLabel>
            <AuthPassword placeholder="Create a password (min. 10 characters)" autoComplete="new-password" minLength={10} />
          </div>
        </>
      ) : null}
      <textarea name="note" placeholder="Tell us what you sell (optional)" className="rounded-2xl border border-line p-3" />
      <button disabled={busy} className="h-11 rounded-full bg-gold font-bold text-ongold disabled:opacity-60">
        {busy ? "Continuing…" : mode === "register" ? "Create account & continue" : "Continue"}
      </button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <p className="text-center text-sm text-ink2">
        <Link href="/forgot?portal=vendor" className="font-semibold text-ink underline underline-offset-2">
          Forgot password? Reset with a 6-digit email code
        </Link>
      </p>
    </form>
  );
}
