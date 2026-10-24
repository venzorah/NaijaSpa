"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AuthHeading,
  AuthLabel,
  AuthScreen,
  authCtaClass,
  authFieldClass
} from "@/components/auth-screen";

export default function ForgotPage() {
  const [msg, setMsg] = useState("");
  return (
    <AuthScreen>
      <AuthHeading title="Password recovery" subtitle="We'll email a reset link if the account exists." />
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/auth/forgot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fd.get("email") })
          });
          const json = await res.json();
          setMsg(json.message || json.error);
        }}
      >
        <div>
          <AuthLabel htmlFor="email">Email Address</AuthLabel>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className={authFieldClass}
          />
        </div>
        <button className={authCtaClass}>Send reset</button>
      </form>
      {msg ? <p className="mt-4 text-center text-sm text-ink2">{msg}</p> : null}
      <p className="mt-6 text-center text-sm text-ink2">
        <Link href="/login" className="font-semibold text-ink">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  );
}
