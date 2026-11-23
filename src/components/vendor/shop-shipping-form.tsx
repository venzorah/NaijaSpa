"use client";

import { useEffect, useState } from "react";

export function VendorShippingForm() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/shop/vendor/shipping").then((r) => r.json()).then((d) => {
      setProfile(d.profile);
      setStates(d.states ?? []);
    }).catch(() => undefined);
  }, []);
  return (
    <form
      className="mt-4 grid max-w-lg gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const zones = states.filter((s) => fd.get(`zone-${s}`) === "on").map((s) => ({ state: s, feeKobo: Number(fd.get(`fee-${s}`) || 0) * 100, etaDays: Number(fd.get(`eta-${s}`) || 5) }));
        const res = await fetch("/api/shop/vendor/shipping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            localEnabled: fd.get("localEnabled") === "on",
            localFeeKobo: Number(fd.get("localFee")) * 100,
            localEtaDays: Number(fd.get("localEta")),
            interstateOn: fd.get("interstateOn") === "on",
            pickupEnabled: fd.get("pickupEnabled") === "on",
            freeAboveKobo: Number(fd.get("freeAbove") || 0) * 100,
            zones
          })
        });
        setMessage(res.ok ? "Saved" : "Could not save");
      }}
    >
      <label><input type="checkbox" name="localEnabled" defaultChecked={(profile as { localEnabled?: boolean } | null)?.localEnabled !== false} /> Local delivery</label>
      <input name="localFee" type="number" placeholder="Local fee ₦" defaultValue={((profile as { localFeeKobo?: number } | null)?.localFeeKobo ?? 0) / 100} className="h-10 rounded-xl border border-line px-3" />
      <input name="localEta" type="number" placeholder="Local days" defaultValue={(profile as { localEtaDays?: number } | null)?.localEtaDays ?? 2} className="h-10 rounded-xl border border-line px-3" />
      <label><input type="checkbox" name="interstateOn" defaultChecked={Boolean((profile as { interstateOn?: boolean } | null)?.interstateOn)} /> Interstate</label>
      <label><input type="checkbox" name="pickupEnabled" /> Allow pickup</label>
      <input name="freeAbove" type="number" placeholder="Free shipping above ₦" className="h-10 rounded-xl border border-line px-3" />
      <div className="max-h-64 overflow-auto rounded-xl border border-line p-2 text-sm">
        {states.map((s) => (
          <label key={s} className="flex items-center gap-2 py-1">
            <input type="checkbox" name={`zone-${s}`} /> {s}
            <input name={`fee-${s}`} type="number" placeholder="₦" className="ml-auto h-8 w-24 rounded border border-line px-2" />
            <input name={`eta-${s}`} type="number" placeholder="days" className="h-8 w-16 rounded border border-line px-2" />
          </label>
        ))}
      </div>
      <button className="h-10 w-fit rounded-full bg-gold px-5 text-sm font-bold text-ongold">Save shipping</button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
