"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import type { HomeHeroAd, HomeHeroBanner } from "@/lib/home-hero";

type Vendor = { id: string; businessName: string; slug: string };
type Payload = { banner: HomeHeroBanner; ads: HomeHeroAd[]; vendors: Vendor[]; displayLimit: number; canEditBanner: boolean };
function TextField({ name, label, value = "", required = true, maxLength = 500 }: { name: string; label: string; value?: string; required?: boolean; maxLength?: number }) {
  return <label className="block text-sm">{label}<input name={name} required={required} maxLength={maxLength} defaultValue={value} className={`${adminField} mt-1`} /></label>;
}
export default function HeroAdsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setData(await adminJson<Payload>("/api/admin/hero")), []);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, [load]);
  async function save(url: string, body: unknown, method = "PUT") {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await adminJson(url, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); await load(); setMessage("Saved. The homepage now uses these settings."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); throw error; }
    finally { setBusy(false); }
  }
  const adForm = (ad?: HomeHeroAd) => <form className="grid gap-3" onSubmit={(e) => {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form);
    const body = { vendorId: fd.get("vendorId") || null, title: fd.get("title"), body: fd.get("body"), imageUrl: fd.get("imageUrl"), ctaLabel: fd.get("ctaLabel"), ctaHref: fd.get("ctaHref"), sortOrder: Number(fd.get("sortOrder")), active: fd.get("active") === "on" };
    void save(ad ? `/api/admin/hero/ads/${ad.id}` : "/api/admin/hero/ads", body, ad ? "PUT" : "POST").then(() => { if (!ad) form.reset(); }).catch(() => {});
  }}><fieldset disabled={busy} className="grid gap-3 disabled:opacity-60">
    <TextField name="title" label="Advert title" value={ad?.title} maxLength={80} />
    <TextField name="body" label="Details" value={ad?.body} required={false} maxLength={280} />
    <TextField name="imageUrl" label="Image URL" value={ad?.imageUrl ?? "/photos/spa.jpg"} />
    <label className="text-sm">Linked vendor<select name="vendorId" defaultValue={ad?.vendorId ?? ""} className={`${adminField} mt-1`}><option value="">No linked vendor</option>{data?.vendors.map(v => <option key={v.id} value={v.id}>{v.businessName}</option>)}</select></label>
    <TextField name="ctaLabel" label="Button label" value={ad?.ctaLabel ?? "View vendor"} maxLength={40} />
    <TextField name="ctaHref" label="Button link" value={ad?.ctaHref ?? "/explore"} maxLength={240} />
    <label className="text-sm">Display order<input type="number" name="sortOrder" min={0} max={99} required defaultValue={ad?.sortOrder ?? 0} className={adminField} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={ad?.active ?? true} />Active</label>
    <div className="flex gap-2"><button className={adminBtn}>{busy ? "Saving…" : ad ? "Save advert" : "Create advert"}</button>{ad ? <button type="button" className={adminBtnOutline} onClick={() => void save(`/api/admin/hero/ads/${ad.id}`, { active: !ad.active }).catch(() => {})}>{ad.active ? "Pause advert" : "Activate advert"}</button> : null}</div>
  </fieldset></form>;
  return <div className="max-w-3xl"><AdminPageHeader screen="hero" />
    <p className="text-sm text-ink2">Manage the main banner and the paid advert carousel beside it. Paid placement does not change a provider’s verification or ratings.</p>
    {message ? <p role="status" className="my-3 text-sm text-goldink">{message}</p> : null}
    {!data ? <p className="mt-6">Loading homepage settings…</p> : <>
      <form key={JSON.stringify(data.banner) + data.displayLimit} className="mt-6 rounded-3xl border border-line bg-card p-5" onSubmit={(e) => {
        e.preventDefault(); const fd = new FormData(e.currentTarget);
        void save("/api/admin/hero", { ...Object.fromEntries(fd), displayLimit: Number(fd.get("displayLimit")) }).catch(() => {});
      }}><h2 className="mb-4 font-display text-xl">Main banner</h2>
        {!data.canEditBanner ? <p className="mb-3 text-sm text-ink2">Banner changes require site content permission. You can manage adverts below.</p> : null}
        <fieldset disabled={busy || !data.canEditBanner} className="grid gap-3 disabled:opacity-60">
          <TextField name="kicker" label="Kicker" value={data.banner.kicker} maxLength={80} /><TextField name="title" label="Title" value={data.banner.title} maxLength={120} />
          <TextField name="subtitle" label="Details" value={data.banner.subtitle} required={false} maxLength={240} /><TextField name="priceLine" label="Price line" value={data.banner.priceLine} required={false} maxLength={80} />
          <TextField name="ctaLabel" label="Button label" value={data.banner.ctaLabel} maxLength={40} /><TextField name="ctaHref" label="Button link" value={data.banner.ctaHref} maxLength={240} /><TextField name="imageUrl" label="Banner image URL" value={data.banner.imageUrl} />
          <label className="text-sm">Adverts to display<input className={adminField} name="displayLimit" type="number" min={1} max={8} required defaultValue={data.displayLimit} /></label>
          <button className={adminBtn}>Save banner</button>
        </fieldset>
      </form>
      <h2 id="premium-ads" className="mt-10 font-display text-xl">Premium vendor adverts</h2>
      {!data.ads.length ? <p className="mt-2 text-sm text-ink2">No adverts. Create one below; the homepage slot stays hidden until an advert is active.</p> : null}
      <ul className="mt-3 space-y-4">{data.ads.map(ad => <li key={JSON.stringify(ad)} className="rounded-3xl border border-line bg-card p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.imageUrl} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />{adForm(ad)}
        <div className="mt-3"><ConfirmAction triggerLabel="Remove advert" title="Remove advert?" description="The advert will stop appearing on the homepage. Its vendor is preserved." confirmLabel="Remove advert" disabled={busy} onConfirm={() => save(`/api/admin/hero/ads/${ad.id}`, null, "DELETE")} /></div>
      </li>)}</ul>
      <section className="mt-6 rounded-3xl border border-dashed border-gold/50 bg-card p-5"><h3 className="mb-4 font-display text-lg">Create a homepage advert</h3>{adForm()}</section>
    </>}
  </div>;
}
