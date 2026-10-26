"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MARKETPLACE_HUBS } from "@/lib/hubs";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";

type Payload = {
  config?: Record<string, number | string>;
  galleryConfig?: { maxImagesPerGallery: number; maxImageBytes: number };
  homeFeedConfig?: { featured: number; premium: number; promo: number; nearby: number };
  plans?: Array<{ code: string; name?: string; priceKobo: number; commissionBps: number }>;
  hubs?: Array<{ id: string; label: string; state: string; locked?: boolean }>;
};

export default function CommercialPage() {
  const [data, setData] = useState<Payload>({});
  useEffect(() => {
    fetch("/api/admin/commercial")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <div>
      <AdminPageHeader screen="commercial" />
      <Panel
        title="Plans, extras and marketplace hubs"
        description="Free vendors pay 10% (or the % you set) on each successful booking — no weekly, monthly or annual fee. Paid packages: Silver weekly, Gold monthly, Platinum yearly. Missed renewal after the grace period returns the listing to Free."
      >
      <form
        key={data.config ? "loaded" : "loading"}
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
              galleryMaxImagesPerGallery: Number(fd.get("galleryImages")),
              galleryMaxImageBytes: Math.round(Number(fd.get("galleryMb")) * 1024 * 1024),
              homeFeedFeaturedLimit: Number(fd.get("homeFeatured")),
              homeFeedPremiumLimit: Number(fd.get("homePremium")),
              homeFeedPromoLimit: Number(fd.get("homePromo")),
              homeFeedNearbyLimit: Number(fd.get("homeNearby")),
              extraStates: fd.getAll("extraState").map(String),
              freeCommissionBps: Math.round(Number(fd.get("freeCommission") || 10) * 100),
              paidCommissionBps: Math.round(Number(fd.get("paidCommission") || 0) * 100),
              graceDays: Number(fd.get("graceDays") || 3),
              plans: [
                { code: "FREE", priceKobo: 0, commissionBps: Math.round(Number(fd.get("freeCommission") || 10) * 100) },
                { code: "SILVER", priceKobo: Number(fd.get("silver")) * 100 },
                { code: "GOLD", priceKobo: Number(fd.get("gold")) * 100 },
                { code: "PLATINUM", priceKobo: Number(fd.get("platinum")) * 100 }
              ]
            })
          });
          alert("Saved and audited.");
        }}
      >
        <label className="text-sm">
          Spa/Office surcharge ₦
          <input name="spa" type="number" defaultValue={Number(data.config?.spaSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Hotel surcharge ₦
          <input name="hotel" type="number" defaultValue={Number(data.config?.hotelSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Home surcharge ₦
          <input name="home" type="number" defaultValue={Number(data.config?.homeSurchargeKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <h2 className="mt-4 font-display text-xl">Vendor listing plans</h2>
        <label className="text-sm">
          Free plan commission %
          <input
            name="freeCommission"
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={(data.plans?.find((p) => p.code === "FREE")?.commissionBps ?? Number(data.config?.freeCommissionBps || 1000)) / 100}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          Paid plan commission %
          <input
            name="paidCommission"
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={(data.plans?.find((p) => p.code === "GOLD")?.commissionBps ?? Number(data.config?.paidCommissionBps || 0)) / 100}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          Silver (weekly) ₦
          <input name="silver" type="number" min={0} defaultValue={(data.plans?.find((p) => p.code === "SILVER")?.priceKobo || 5_000_000) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Gold (monthly) ₦
          <input name="gold" type="number" min={0} defaultValue={(data.plans?.find((p) => p.code === "GOLD")?.priceKobo || 18_000_000) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Platinum (yearly) ₦
          <input name="platinum" type="number" min={0} defaultValue={(data.plans?.find((p) => p.code === "PLATINUM")?.priceKobo || 51_000_000) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Grace days after plan end
          <input name="graceDays" type="number" min={0} max={30} defaultValue={Number(data.config?.graceDays ?? 3)} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <p className="text-xs text-ink2">
          Renewal notices: Silver 2/1/0 days, Gold 7/3/1 days, Platinum 30/14/7/1 days before the end date. After grace, unpaid listings go back to Free.
        </p>
        <h2 className="mt-4 font-display text-xl">Therapist galleries</h2>
        <p className="text-xs text-ink2">Vendors may create at most 7 galleries. Image count and file size are editable here.</p>
        <label className="text-sm">
          Max images per gallery
          <input
            name="galleryImages"
            type="number"
            min={1}
            max={30}
            defaultValue={data.galleryConfig?.maxImagesPerGallery ?? 10}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          Max image size (MB)
          <input
            name="galleryMb"
            type="number"
            min={0.05}
            max={10}
            step={0.1}
            defaultValue={Number((((data.galleryConfig?.maxImageBytes ?? 2 * 1024 * 1024) / (1024 * 1024)).toFixed(1)))}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <h2 className="mt-4 font-display text-xl">Home feed</h2>
        <p className="text-xs text-ink2">
          How many cards appear on each homepage rail. Values are clamped between 1 and 24 so a bad save cannot empty or
          explode the page. VIP is the Premium rail.
        </p>
        <label className="text-sm">
          Featured (Top-rated)
          <input
            name="homeFeatured"
            type="number"
            min={1}
            max={24}
            defaultValue={data.homeFeedConfig?.featured ?? 8}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          VIP / Premium
          <input
            name="homePremium"
            type="number"
            min={1}
            max={24}
            defaultValue={data.homeFeedConfig?.premium ?? 8}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          Promo
          <input
            name="homePromo"
            type="number"
            min={1}
            max={24}
            defaultValue={data.homeFeedConfig?.promo ?? 8}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <label className="text-sm">
          Nearby spas &amp; studios
          <input
            name="homeNearby"
            type="number"
            min={1}
            max={24}
            defaultValue={data.homeFeedConfig?.nearby ?? 8}
            className="ml-2 rounded-xl bg-elev px-2"
          />
        </label>
        <h2 className="mt-4 font-display text-xl">Marketplace locations</h2>
        <p className="text-xs text-ink2">
          Lagos, Abuja, Port Harcourt, Delta and Anambra stay in the top-bar city picker. Tick extra states to add them.
        </p>
        <div className="flex flex-wrap gap-2">
          {(data.hubs ?? DEFAULT_MARKETPLACE_HUBS).filter((h) => h.locked).map((h) => (
            <span key={h.id} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-goldink">
              {h.label}
            </span>
          ))}
        </div>
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-line p-3 text-sm sm:grid-cols-3">
          {NIGERIA_STATES.filter((s) => !["Lagos", "FCT", "Rivers", "Delta", "Anambra"].includes(s)).map((state) => {
            const on = Boolean(data.hubs?.some((h) => h.state === state && !h.locked));
            return (
              <label key={state} className="flex min-h-10 items-center gap-2">
                <input type="checkbox" name="extraState" value={state} defaultChecked={on} />
                {state}
              </label>
            );
          })}
        </div>
        <button className="min-h-11 rounded-full bg-gold font-bold text-ongold">Save</button>
      </form>
      </Panel>
    </div>
  );
}
