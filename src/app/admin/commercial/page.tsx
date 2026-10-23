"use client";

import { useEffect, useState } from "react";

type Payload = {
  config?: Record<string, number | string>;
  galleryConfig?: { maxImagesPerGallery: number; maxImageBytes: number };
  homeFeedConfig?: { featured: number; premium: number; promo: number; nearby: number };
  plans?: Array<{ code: string; priceKobo: number; commissionBps: number }>;
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
      <h1 className="font-display text-3xl">Commercial config</h1>
      <p className="text-sm text-ink2">
        Free plan is ₦0 / 10% commission. Paid plan prices are not hardcoded — set them here. Hotel and Home extras are
        vendor-set per service (Spa/Office is always ₦0 extra). Keep platform surcharges at ₦0 unless you need a platform
        fee on top. Therapist gallery image limits and home-feed item counts are stored in SystemConfig.
      </p>
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
        <label className="text-sm">
          Weekly price ₦
          <input name="weekly" type="number" defaultValue={(data.plans?.find((p) => p.code === "WEEKLY")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Monthly price ₦
          <input name="monthly" type="number" defaultValue={(data.plans?.find((p) => p.code === "MONTHLY")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <label className="text-sm">
          Six-month price ₦
          <input name="six" type="number" defaultValue={(data.plans?.find((p) => p.code === "SIX_MONTH")?.priceKobo || 0) / 100} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
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
        <button className="min-h-11 rounded-full bg-gold font-bold text-ongold">Save</button>
      </form>
    </div>
  );
}
