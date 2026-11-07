"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthHeading, AuthScreen, authCtaClass } from "@/components/auth-screen";
import { vendorCancelPath, vendorNext } from "@/lib/vendor-access";

export function VendorAccessGate({ roleLabel, next, back }: { roleLabel: string; next: string; back: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function switchAccount(register: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not switch accounts. Please try again.");
      // Remove account-specific drafts, then reload to discard the React router
      // cache and in-memory user state. Theme and location preferences are kept.
      try {
        sessionStorage.removeItem("naijaspa-pending-booking");
        sessionStorage.removeItem("naijaspa-vendor-onboarding-step");
        sessionStorage.removeItem("naijaspa-vendor-onboarding-step-edit");
      } catch { /* Storage can be disabled. */ }
      window.location.replace(register ? "/register?asVendor=1" : `/login/vendor?${new URLSearchParams({ next: vendorNext(next) })}`);
    } catch {
      setError("Could not switch accounts. Please try again."); setBusy(false);
    }
  }
  return <AuthScreen>
    <AuthHeading title="Access your vendor account" subtitle={`You're currently signed in as ${roleLabel}.`} />
    <p className="mt-5 text-center text-sm text-ink2">To access the Vendor Dashboard, log into your Vendor Account or register as a Vendor. Your current session stays active unless you choose to switch accounts.</p>
    {error ? <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p> : null}
    <div className="mt-6 space-y-3" aria-busy={busy}>
      <button type="button" disabled={busy} className={authCtaClass} onClick={() => switchAccount(false)}>{busy ? "Switching accounts…" : "Log into Vendor Account"}</button>
      <button type="button" disabled={busy} className="min-h-12 w-full rounded-full border border-line bg-card text-sm font-semibold disabled:opacity-60" onClick={() => switchAccount(true)}>Register as Vendor</button>
      <Link href={vendorCancelPath(back)} className="flex min-h-12 items-center justify-center rounded-full text-sm font-semibold text-ink2">Cancel</Link>
    </div>
  </AuthScreen>;
}
