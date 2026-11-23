"use client";

import { useState } from "react";

export function ShopPlanEditor({
  plan
}: {
  plan: { id: string; code: string; name: string; priceKobo: number; commissionBps: number; durationDays: number; featuredBoost: boolean; active: boolean };
}) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="grid gap-2 rounded-3xl border border-line bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/admin/shop/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: plan.id,
            name: fd.get("name"),
            priceKobo: Number(fd.get("priceNaira")) * 100,
            commissionPercent: Number(fd.get("commissionPercent")),
            durationDays: Number(fd.get("durationDays")),
            featuredBoost: fd.get("featuredBoost") === "on",
            active: fd.get("active") === "on"
          })
        });
        setMessage(res.ok ? "Saved" : "Could not save");
      }}
    >
      <p className="text-xs font-bold uppercase text-goldink">{plan.code}</p>
      <input name="name" defaultValue={plan.name} className="h-10 rounded-xl border border-line px-3" />
      <label className="text-sm">Price ₦<input name="priceNaira" type="number" defaultValue={plan.priceKobo / 100} className="ml-2 h-10 rounded-xl border border-line px-3" /></label>
      <label className="text-sm">Commission %<input name="commissionPercent" type="number" min={0} max={100} defaultValue={plan.commissionBps / 100} className="ml-2 h-10 rounded-xl border border-line px-3" /></label>
      <label className="text-sm">Days<input name="durationDays" type="number" defaultValue={plan.durationDays} className="ml-2 h-10 rounded-xl border border-line px-3" /></label>
      <label className="text-sm"><input type="checkbox" name="featuredBoost" defaultChecked={plan.featuredBoost} /> Featured boost</label>
      <label className="text-sm"><input type="checkbox" name="active" defaultChecked={plan.active} /> Active</label>
      <button className="h-10 w-fit rounded-full bg-gold px-4 text-sm font-bold text-ongold">Save</button>
      {message ? <p className="text-xs text-goldink">{message}</p> : null}
    </form>
  );
}
