"use client";

import { useState } from "react";

export function SellOnShop({ states, canActivate }: { states: string[]; canActivate: boolean }) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"activate" | "register">(canActivate ? "activate" : "register");
  return (
    <form
      className="mt-6 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = Object.fromEntries(fd.entries());
        const res = await fetch("/api/shop/vendor/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, ...payload })
        });
        const data = await res.json();
        setMessage(res.ok ? "Application received. Admin will review it." : data.error || "Could not apply");
      }}
    >
      {canActivate ? (
        <label className="text-sm"><input type="radio" checked={mode === "activate"} onChange={() => setMode("activate")} /> Activate Product Store on my existing vendor account</label>
      ) : null}
      <label className="text-sm"><input type="radio" checked={mode === "register"} onChange={() => setMode("register")} /> Register as a product-only seller</label>
      {mode === "register" ? (
        <>
          <input required name="name" placeholder="Your name" className="h-11 rounded-2xl border border-line px-3" />
          <input required type="email" name="email" placeholder="Email" className="h-11 rounded-2xl border border-line px-3" />
          <input required type="password" name="password" minLength={8} placeholder="Password" className="h-11 rounded-2xl border border-line px-3" />
          <input required name="businessName" placeholder="Business name" className="h-11 rounded-2xl border border-line px-3" />
          <select required name="state" className="h-11 rounded-2xl border border-line px-3">{states.map((s) => <option key={s}>{s}</option>)}</select>
          <input required name="city" placeholder="City" className="h-11 rounded-2xl border border-line px-3" />
          <input required name="neighbourhood" placeholder="Neighbourhood" className="h-11 rounded-2xl border border-line px-3" />
          <input required name="address" placeholder="Address" className="h-11 rounded-2xl border border-line px-3" />
        </>
      ) : null}
      <textarea name="note" placeholder="Tell us what you sell (optional)" className="rounded-2xl border border-line p-3" />
      <button className="h-11 rounded-full bg-gold font-bold text-ongold">Submit application</button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
