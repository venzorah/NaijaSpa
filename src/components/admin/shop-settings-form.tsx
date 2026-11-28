"use client";

import { useEffect, useState } from "react";

export function ShopSettingsForm() {
  const [data, setData] = useState<{
    vendorStates: string[];
    settlementDays: number;
    minPayoutKobo: number;
    payoutMode: string;
    productImageMaxMb: number;
    states: string[];
  } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/admin/shop/settings").then((r) => r.json()).then(setData).catch(() => undefined);
  }, []);
  if (!data) return <p className="mt-4 text-sm">Loading…</p>;
  return (
    <form
      className="mt-6 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const vendorStates = fd.getAll("vendorStates").map(String);
        const res = await fetch("/api/admin/shop/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorStates,
            settlementDays: Number(fd.get("settlementDays")),
            minPayoutKobo: Number(fd.get("minPayoutNaira")) * 100,
            payoutMode: fd.get("payoutMode"),
            productImageMaxMb: Number(fd.get("productImageMaxMb"))
          })
        });
        setMessage(res.ok ? "Saved" : "Could not save");
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">Approved seller states</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
          {data.states.map((s) => (
            <label key={s}><input type="checkbox" name="vendorStates" value={s} defaultChecked={data.vendorStates.includes(s)} /> {s}</label>
          ))}
        </div>
      </fieldset>
      <label className="text-sm">Settlement days<input name="settlementDays" type="number" defaultValue={data.settlementDays} className="ml-2 h-10 rounded-xl border border-line px-3" /></label>
      <label className="text-sm">Minimum payout ₦<input name="minPayoutNaira" type="number" defaultValue={data.minPayoutKobo / 100} className="ml-2 h-10 rounded-xl border border-line px-3" /></label>
      <label className="text-sm">
        Product image upload limit (MB)
        <input
          name="productImageMaxMb"
          type="number"
          min={1}
          max={5}
          step={1}
          defaultValue={data.productImageMaxMb ?? 2}
          className="ml-2 h-10 w-20 rounded-xl border border-line px-3"
        />
        <span className="ml-2 text-xs text-ink2">Whole megabytes only. Maximum 5 MB.</span>
      </label>
      <select name="payoutMode" defaultValue={data.payoutMode} className="h-11 rounded-xl border border-line px-3">
        <option value="request">Request-based</option>
        <option value="automatic">Automatic when due</option>
      </select>
      <button className="h-11 w-fit rounded-full bg-gold px-5 text-sm font-bold text-ongold">Save</button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
