"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { VendorPlansConsole } from "@/components/admin/vendor-plans-console";
import { adminJson } from "@/components/admin/json";

type Payload = {
  config?: Record<string, number | string>;
  galleryConfig?: { maxImagesPerGallery: number; maxImageBytes: number };
  homeFeedConfig?: { featured: number; premium: number; promo: number; nearby: number };
  plans?: Array<{ code: string; name?: string; priceKobo: number; commissionBps: number }>;
  hubs?: Array<{ id: string; label: string; state: string; locked?: boolean }>;
};

export default function CommercialPage() {
  const [data, setData] = useState<Payload>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/admin/commercial")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <div>
      <AdminPageHeader screen="commercial" />
      <h2 className="mb-3 font-display text-xl">Therapist listing plans</h2>
      <VendorPlansConsole />
      <Panel
        title="Extras, grace and marketplace hubs"
        description="Location extras, galleries, home feed and cities. Listing plan prices are saved on each plan card above."
      >
      <form
        key={data.config ? "loaded" : "loading"}
        className="mt-6 grid max-w-xl gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const fd = new FormData(e.currentTarget);
          try {
            await adminJson("/api/admin/commercial", {
              method: "PUT",
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
                graceDays: Number(fd.get("graceDays") || 3)
              })
            });
          } catch {
            /* adminJson already surfaces the error toast */
          } finally {
            setBusy(false);
          }
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
        <h2 className="mt-4 font-display text-xl">Renewal grace</h2>
        <label className="text-sm">
          Grace days after plan end
          <input name="graceDays" type="number" min={0} max={30} defaultValue={Number(data.config?.graceDays ?? 3)} className="ml-2 rounded-xl bg-elev px-2" />
        </label>
        <p className="text-xs text-ink2">After grace, unpaid Silver, Gold or Platinum listings return to Free. Notices follow each package length.</p>
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
          The marketplace uses each visitor&apos;s network location. There is no default Lagos / Abuja / Port Harcourt list.
          Visitors can still pick any Nigerian state from the location chip.
        </p>
        <button disabled={busy} className="min-h-11 rounded-full bg-gold font-bold text-ongold disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      </Panel>
    </div>
  );
}
