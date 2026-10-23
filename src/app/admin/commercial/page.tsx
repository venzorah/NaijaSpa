"use client";

import { useEffect, useState } from "react";

export default function CommercialPage() {
  const [data, setData] = useState<{ config?: Record<string, number | string>; plans?: Array<{ code: string; priceKobo: number; commissionBps: number }> }>({});
  useEffect(() => {
    fetch("/api/admin/commercial")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Commercial config</h1>
      <p className="text-sm text-ink2">
        Free plan is ₦0 / 10% commission. Paid plan prices are not hardcoded — set them here. Hotel and Home extras are
        vendor-set per service (Spa/Office is always ₦0 extra). Keep platform surcharges at ₦0 unless you need a platform
        fee on top.
      </p>
      <form
        className="mt-6 grid max-w-xl gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await fetch("/api/admin/commercial", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spaSurchargeKobo: Number(fd.get("spa")) * 100,
              hotelSurchargeKobo: Number(fd.get("hotel")) * 100,
              homeSurchargeKobo: Number(fd.get("home")) * 100,
              plans: [
                { code: "WEEKLY", priceKobo: Number(fd.get("weekly")) * 100 },
                { code: "MONTHLY", priceKobo: Number(fd.get("monthly")) * 100 },
                { code: "SIX_MONTH", priceKobo: Number(fd.get("six")) * 100 }
              ]
            })
          });
          alert("Saved and audited.");
        }}
      >
        <label className="text-sm">Spa/Office surcharge ₦<input name="spa" type="number" defaultValue={Number(data.config?.spaSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <label className="text-sm">Hotel surcharge ₦<input name="hotel" type="number" defaultValue={Number(data.config?.hotelSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <label className="text-sm">Home surcharge ₦<input name="home" type="number" defaultValue={Number(data.config?.homeSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <label className="text-sm">Weekly price ₦<input name="weekly" type="number" defaultValue={(data.plans?.find((p) => p.code === "WEEKLY")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <label className="text-sm">Monthly price ₦<input name="monthly" type="number" defaultValue={(data.plans?.find((p) => p.code === "MONTHLY")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <label className="text-sm">Six-month price ₦<input name="six" type="number" defaultValue={(data.plans?.find((p) => p.code === "SIX_MONTH")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" /></label>
        <button className="min-h-11 rounded-full bg-gold font-bold text-ongold">Save</button>
      </form>
    </div>
  );
}
