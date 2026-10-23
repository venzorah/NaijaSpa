"use client";

import { useState } from "react";

export default function ForgotPage() {
  const [msg, setMsg] = useState("");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl">Password recovery</h1>
      <form
        className="mt-6 space-y-3"
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
        <input name="email" type="email" required className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
        <button className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold">Send reset</button>
      </form>
      {msg && <p className="mt-4 text-sm text-ink2">{msg}</p>}
    </div>
  );
}
