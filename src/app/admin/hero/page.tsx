"use client";

import { useEffect, useState } from "react";

type VendorOpt = { id: string; businessName: string; slug: string };
type AdRow = {
  id: string;
  vendorId: string | null;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  active: boolean;
};
type Payload = {
  banner?: {
    kicker: string;
    title: string;
    subtitle: string;
    priceLine: string;
    ctaLabel: string;
    ctaHref: string;
    imageUrl: string;
  };
  ads?: AdRow[];
  displayLimit?: number;
  vendors?: VendorOpt[];
};

const field = "mt-1 w-full rounded-xl border border-line bg-elev px-3 py-2 text-base";

export default function HeroAdsPage() {
  const [data, setData] = useState<Payload>({});
  const [message, setMessage] = useState("");

  const load = () =>
    fetch("/api/admin/hero")
      .then((r) => r.json())
      .then(setData);

  useEffect(() => {
    load();
  }, []);

  const banner = data.banner;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Homepage hero &amp; ads</h1>
      <p className="mt-2 text-sm text-ink2">
        Change the main banner image and copy, then post premium vendor ads for the compact carousel beside it. The
        carousel shows one ad at a time and rotates every 3 seconds unless a visitor clicks the arrows or dots. You
        choose how many ads to display even though the slot is sized for two premium vendors.
      </p>
      {message ? <p className="mt-3 text-sm text-goldink">{message}</p> : null}

      <form
        key={banner ? "banner-loaded" : "banner-loading"}
        className="mt-6 grid gap-3 rounded-3xl border border-line bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/admin/hero", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kicker: String(fd.get("kicker") || ""),
              title: String(fd.get("title") || ""),
              subtitle: String(fd.get("subtitle") || ""),
              priceLine: String(fd.get("priceLine") || ""),
              ctaLabel: String(fd.get("ctaLabel") || ""),
              ctaHref: String(fd.get("ctaHref") || ""),
              imageUrl: String(fd.get("imageUrl") || ""),
              displayLimit: Number(fd.get("displayLimit"))
            })
          });
          setMessage(res.ok ? "Hero banner and ad count saved." : "Could not save the hero.");
          if (res.ok) load();
        }}
      >
        <h2 className="font-display text-xl">Main banner</h2>
        <label className="text-sm">
          Kicker
          <input name="kicker" required defaultValue={banner?.kicker} className={field} />
        </label>
        <label className="text-sm">
          Title
          <input name="title" required defaultValue={banner?.title} className={field} />
        </label>
        <label className="text-sm">
          Details
          <textarea name="subtitle" rows={2} defaultValue={banner?.subtitle} className={field} />
        </label>
        <label className="text-sm">
          Price line
          <input name="priceLine" defaultValue={banner?.priceLine} className={field} />
        </label>
        <label className="text-sm">
          Button label
          <input name="ctaLabel" required defaultValue={banner?.ctaLabel} className={field} />
        </label>
        <label className="text-sm">
          Button link
          <input name="ctaHref" required defaultValue={banner?.ctaHref} className={field} />
        </label>
        <label className="text-sm">
          Banner image URL
          <input name="imageUrl" required defaultValue={banner?.imageUrl} className={field} />
        </label>
        <p className="text-xs text-ink2">Use a local photo such as /photos/hero-1.jpg or /photos/hero-2.jpg.</p>
        <label className="text-sm">
          Ads to display
          <input
            name="displayLimit"
            type="number"
            min={1}
            max={8}
            defaultValue={data.displayLimit ?? 2}
            className={field}
          />
        </label>
        <button className="min-h-11 rounded-full bg-gold px-6 font-bold text-ongold">Save hero</button>
      </form>

      <h2 className="mt-10 font-display text-xl">Premium vendor ads</h2>
      <ul className="mt-3 space-y-4">
        {(data.ads ?? []).map((ad) => (
          <li key={ad.id} className="rounded-3xl border border-line bg-card p-5">
            <form
              className="grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const res = await fetch(`/api/admin/hero/ads/${ad.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    vendorId: String(fd.get("vendorId") || "") || null,
                    title: String(fd.get("title") || ""),
                    body: String(fd.get("body") || ""),
                    imageUrl: String(fd.get("imageUrl") || ""),
                    ctaLabel: String(fd.get("ctaLabel") || ""),
                    ctaHref: String(fd.get("ctaHref") || ""),
                    sortOrder: Number(fd.get("sortOrder")),
                    active: fd.get("active") === "on"
                  })
                });
                setMessage(res.ok ? "Ad updated." : "Could not update that ad.");
                if (res.ok) load();
              }}
            >
              <label className="text-sm">
                Title
                <input name="title" required defaultValue={ad.title} className={field} />
              </label>
              <label className="text-sm">
                Details
                <textarea name="body" rows={2} defaultValue={ad.body} className={field} />
              </label>
              <label className="text-sm">
                Image URL
                <input name="imageUrl" required defaultValue={ad.imageUrl} className={field} />
              </label>
              <label className="text-sm">
                Vendor
                <select name="vendorId" defaultValue={ad.vendorId ?? ""} className={field}>
                  <option value="">No linked vendor</option>
                  {(data.vendors ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Button label
                <input name="ctaLabel" required defaultValue={ad.ctaLabel} className={field} />
              </label>
              <label className="text-sm">
                Button link
                <input name="ctaHref" required defaultValue={ad.ctaHref} className={field} />
              </label>
              <label className="text-sm">
                Sort order
                <input name="sortOrder" type="number" min={0} max={99} defaultValue={ad.sortOrder} className={field} />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked={ad.active} />
                Active
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="min-h-11 rounded-full bg-gold px-5 font-bold text-ongold">Save ad</button>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold"
                  onClick={async () => {
                    if (!confirm("Delete this ad?")) return;
                    const res = await fetch(`/api/admin/hero/ads/${ad.id}`, { method: "DELETE" });
                    setMessage(res.ok ? "Ad deleted." : "Could not delete that ad.");
                    if (res.ok) load();
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>

      <form
        className="mt-6 grid gap-3 rounded-3xl border border-dashed border-gold/50 bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const res = await fetch("/api/admin/hero/ads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendorId: String(fd.get("vendorId") || "") || null,
              title: String(fd.get("title") || ""),
              body: String(fd.get("body") || ""),
              imageUrl: String(fd.get("imageUrl") || ""),
              ctaLabel: String(fd.get("ctaLabel") || ""),
              ctaHref: String(fd.get("ctaHref") || ""),
              sortOrder: Number(fd.get("sortOrder") || 0),
              active: true
            })
          });
          setMessage(res.ok ? "Ad posted." : "Could not post that ad.");
          if (res.ok) {
            form.reset();
            load();
          }
        }}
      >
        <h3 className="font-display text-lg">Post a new ad</h3>
        <label className="text-sm">
          Title
          <input name="title" required placeholder="Vendor name" className={field} />
        </label>
        <label className="text-sm">
          Details
          <textarea name="body" rows={2} className={field} />
        </label>
        <label className="text-sm">
          Image URL
          <input name="imageUrl" required defaultValue="/photos/spa.jpg" className={field} />
        </label>
        <label className="text-sm">
          Vendor
          <select name="vendorId" className={field}>
            <option value="">No linked vendor</option>
            {(data.vendors ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Button label
          <input name="ctaLabel" defaultValue="View vendor" className={field} />
        </label>
        <label className="text-sm">
          Button link
          <input name="ctaHref" required placeholder="/providers/osun-wellness" className={field} />
        </label>
        <label className="text-sm">
          Sort order
          <input name="sortOrder" type="number" min={0} max={99} defaultValue={0} className={field} />
        </label>
        <button className="min-h-11 rounded-full bg-gold px-6 font-bold text-ongold">Post ad</button>
      </form>
    </div>
  );
}
