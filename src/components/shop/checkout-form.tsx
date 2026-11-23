"use client";

import { useState } from "react";
import { formatNgn } from "@/lib/money";

export function ShopCheckoutForm({ states }: { states: string[] }) {
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<{ groups: { businessName: string; productKobo: number; shippingKobo: number; shipOk: boolean; shipReason?: string }[]; totalKobo: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(preview: boolean, form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          neighbourhood: data.neighbourhood,
          pickup: data.pickup === "on"
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (preview) {
        setQuote(json.quote);
        return;
      }
      if (json.pay?.authorizationUrl) location.href = json.pay.authorizationUrl;
      else setMessage(json.pay?.message || "Order placed. Paystack is not configured on this host.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-6 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false, e.currentTarget);
      }}
    >
      <input required name="name" placeholder="Full name" className="h-11 rounded-2xl border border-line px-3" />
      <input required type="email" name="email" placeholder="Email" className="h-11 rounded-2xl border border-line px-3" />
      <input required name="phone" placeholder="Phone" className="h-11 rounded-2xl border border-line px-3" />
      <input required name="address" placeholder="Street address" className="h-11 rounded-2xl border border-line px-3" />
      <input required name="city" placeholder="City" className="h-11 rounded-2xl border border-line px-3" />
      <select required name="state" className="h-11 rounded-2xl border border-line px-3" defaultValue="Lagos">
        {states.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <input name="neighbourhood" placeholder="Neighbourhood (optional)" className="h-11 rounded-2xl border border-line px-3" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pickup" /> Pickup if the seller offers it</label>
      <button type="button" className="h-11 rounded-full border border-line text-sm font-semibold" disabled={busy} onClick={(e) => void submit(true, (e.currentTarget as HTMLButtonElement).form!)}>
        Preview shipping
      </button>
      {quote ? (
        <div className="rounded-3xl border border-line bg-card p-4 text-sm">
          {quote.groups.map((g) => (
            <p key={g.businessName} className="flex justify-between gap-2 py-1">
              <span>{g.businessName}</span>
              <span>{g.shipOk ? `${formatNgn(g.productKobo)} + ship ${formatNgn(g.shippingKobo)}` : g.shipReason}</span>
            </p>
          ))}
          <p className="mt-2 font-semibold">Total {formatNgn(quote.totalKobo)}</p>
        </div>
      ) : null}
      <button disabled={busy} className="h-11 rounded-full bg-gold text-sm font-bold text-ongold">{busy ? "Working…" : "Pay with Paystack"}</button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
