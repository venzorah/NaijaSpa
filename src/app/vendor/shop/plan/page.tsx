"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

export default function VendorShopPlanPage() {
  const [plans, setPlans] = useState<{ code: string; name: string; priceKobo: number; commissionBps: number }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    fetch("/api/shop/vendor/subscribe").then((r) => r.json()).then((d) => setPlans(d.plans ?? [])).catch(() => undefined);
  }, []);
  return (
    <div>
      <h1 className="font-display text-2xl">Shop plan</h1>
      <p className="text-sm text-ink2">This is not your service listing plan.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <form
            key={p.code}
            className="rounded-3xl border border-line bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(p.code);
              setMessage("");
              let leaving = false;
              try {
                const res = await fetch("/api/shop/vendor/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCode: p.code }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not update");
                if (data.pay?.authorizationUrl) {
                  leaving = true;
                  shopSuccess("Opening Paystack to activate this plan.");
                  window.location.assign(data.pay.authorizationUrl);
                  return;
                }
                setMessage("Plan updated.");
                shopSuccess("Shop plan updated.");
              } catch (err) {
                const text = err instanceof Error ? err.message : "Could not update";
                setMessage(text);
                shopError(text);
              } finally {
                if (!leaving) setBusy("");
              }
            }}
          >
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm">{formatNgn(p.priceKobo)} · {p.commissionBps / 100}% commission</p>
            <button disabled={Boolean(busy)} className="mt-3 h-10 rounded-full bg-gold px-4 text-sm font-bold text-ongold disabled:opacity-60">{busy === p.code ? "Working…" : "Choose"}</button>
          </form>
        ))}
      </div>
      {!plans.length ? <p className="mt-4 text-sm text-ink2">Shop plans load when the database is reachable. Free and Monthly are separate from listing plans.</p> : null}
      {message ? <p className="mt-3 text-sm text-goldink">{message}</p> : null}
    </div>
  );
}
