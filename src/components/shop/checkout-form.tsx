"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNgn } from "@/lib/money";
import { shopClientPath } from "@/lib/shop/paths";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

const field = "h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm outline-none ring-gold/30 focus:ring-2";

export function ShopCheckoutForm({ states }: { states: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<{ groups: { businessName: string; productKobo: number; shippingKobo: number; shipOk: boolean; shipReason?: string }[]; totalKobo: number } | null>(null);
  const [busy, setBusy] = useState<"preview" | "pay" | "">("");

  async function submit(preview: boolean, form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(preview ? "preview" : "pay");
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
        shopSuccess("Shipping preview is ready. Pay when you are satisfied.");
        setBusy("");
        return;
      }
      if (json.pay?.authorizationUrl) {
        shopSuccess("Order placed. Opening Paystack to complete payment.");
        window.location.assign(json.pay.authorizationUrl);
        return;
      }
      const note = json.pay?.message || "Order placed. Paystack is not configured on this host.";
      setMessage(note);
      shopError(note);
      setBusy("");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Checkout failed";
      setMessage(text);
      shopError(text);
      setBusy("");
      if (/empty/i.test(text)) router.push(shopClientPath("/cart"));
    }
  }

  return (
    <form
      className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false, e.currentTarget);
      }}
    >
      <div className="space-y-3 rounded-[1.75rem] border border-line bg-card p-5">
        <h2 className="font-semibold">Delivery</h2>
        <p className="text-sm text-ink2">Anyone can complete this form and pay. Sign in is optional.</p>
        <input required name="name" placeholder="Full name" className={field} />
        <input required type="email" name="email" placeholder="Email" className={field} />
        <input required name="phone" placeholder="Phone" className={field} />
        <input required name="address" placeholder="Street address" className={field} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input required name="city" placeholder="City" className={field} />
          <select required name="state" className={field} defaultValue="Lagos">
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <input name="neighbourhood" placeholder="Neighbourhood (optional)" className={field} />
        <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" name="pickup" /> Pickup if this seller offers it</label>
      </div>
      <aside className="h-fit space-y-3 rounded-[1.75rem] border border-line bg-card p-5">
        <h2 className="font-semibold">Order breakdown</h2>
        <p className="text-xs text-ink2">One payment. Each seller’s shipping is separate and frozen at checkout.</p>
        <button type="button" className="h-11 w-full rounded-full border border-line text-sm font-semibold disabled:opacity-60" disabled={Boolean(busy)} onClick={(e) => void submit(true, (e.currentTarget as HTMLButtonElement).form!)}>
          {busy === "preview" ? "Calculating…" : "Preview shipping"}
        </button>
        {quote ? (
          <div className="rounded-2xl bg-elev p-4 text-sm">
            {quote.groups.map((g) => (
              <p key={g.businessName} className="flex justify-between gap-2 py-1.5">
                <span>{g.businessName}</span>
                <span className="text-right">{g.shipOk ? `${formatNgn(g.productKobo)} + ${formatNgn(g.shippingKobo)}` : g.shipReason}</span>
              </p>
            ))}
            <p className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatNgn(quote.totalKobo)}</span></p>
          </div>
        ) : null}
        <button type="submit" disabled={Boolean(busy)} className="h-11 w-full rounded-full bg-gold text-sm font-bold text-ongold disabled:opacity-60">
          {busy === "pay" ? "Opening Paystack…" : "Pay with Paystack"}
        </button>
        {message ? <p className="text-sm text-goldink">{message}</p> : null}
      </aside>
    </form>
  );
}
