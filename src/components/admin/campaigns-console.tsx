"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/admin/panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { CAMPAIGN_PLACEMENTS, campaignStatus } from "@/lib/campaigns";

type Row = { id: string; vendorId: string; vendor: string; serviceId: string | null; service: string; placement: string; active: boolean; priority: number; impressions: number; clicks: number; startsAt: string; endsAt: string };
type Vendor = { id: string; businessName: string; services: { id: string; name: string }[] };
const localTime = (date: string) => new Date(new Date(date).getTime() + 3600000).toISOString().slice(0, 16);

export function CampaignsConsole({ rows, vendors, editable }: { rows: Row[]; vendors: Vendor[]; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const current = editing && editing !== "new" ? editing : null;
  async function run(fn: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await fn(); setMessage(success); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <Panel title="Homepage advertising" description="The compact advert beside the hero is managed separately from service placements.">
      <Link href="/admin/hero#premium-ads" className={adminBtnOutline}>Manage homepage adverts</Link>
    </Panel>
    {message ? <p role="status" className="text-sm text-goldink">{message}</p> : null}
    <Panel title="Sponsored placements" description="Choose the vendor, service, position and schedule. Only approved, public listings can appear.">
      <button type="button" className={adminBtn} disabled={!editable || busy} onClick={() => { setEditing("new"); setVendorId(vendors[0]?.id ?? ""); setMessage(""); }}>New campaign</button>
      {editing ? <form key={current?.id ?? "new"} className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault(); const fd = new FormData(e.currentTarget);
        void run(async () => {
          await adminJson(current ? `/api/admin/campaigns/${current.id}` : "/api/admin/campaigns", { method: current ? "PATCH" : "POST", body: JSON.stringify({
            vendorId, serviceId: fd.get("serviceId") || null, placement: fd.get("placement"),
            startsAt: new Date(`${fd.get("startsAt")}:00+01:00`).toISOString(), endsAt: new Date(`${fd.get("endsAt")}:00+01:00`).toISOString(),
            priority: Number(fd.get("priority")), active: fd.get("active") === "on"
          }) }); setEditing(null);
        }, current ? "Campaign updated." : "Campaign created.");
      }}>
        <label className="text-xs">Vendor<select required className={adminField} value={vendorId} disabled={busy} onChange={(e) => setVendorId(e.target.value)}>{vendors.map(v => <option key={v.id} value={v.id}>{v.businessName}</option>)}</select></label>
        <label className="text-xs">Service<select key={vendorId} name="serviceId" className={adminField} defaultValue={current?.vendorId === vendorId ? current.serviceId ?? "" : ""}><option value="">Any active service</option>{vendors.find(v => v.id === vendorId)?.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs">Placement<select name="placement" className={adminField} defaultValue={current?.placement ?? "homepage_featured"}>{Object.entries(CAMPAIGN_PLACEMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs">Priority (higher appears first)<input className={adminField} name="priority" type="number" min={0} max={999} required defaultValue={current?.priority ?? 0} /></label>
        <label className="text-xs">Starts (Nigeria time)<input className={adminField} name="startsAt" type="datetime-local" required defaultValue={localTime(current?.startsAt ?? new Date().toISOString())} /></label>
        <label className="text-xs">Ends (Nigeria time)<input className={adminField} name="endsAt" type="datetime-local" required defaultValue={localTime(current?.endsAt ?? new Date(Date.now() + 7 * 86400000).toISOString())} /></label>
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={current?.active ?? true} />Enabled</label>
        <div className="flex gap-2"><button className={adminBtn} disabled={!editable || busy}>{busy ? "Saving…" : "Save campaign"}</button><button type="button" className={adminBtnOutline} disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
      </form> : null}
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line">{["Vendor / service", "Placement", "Schedule (Nigeria)", "Impressions / clicks", "Status", "Actions"].map(h => <th key={h} className="p-2 text-xs">{h}</th>)}</tr></thead><tbody>{rows.map(c => <tr key={c.id} className="border-b border-line">
        <td className="p-2">{c.vendor}<span className="block text-xs text-ink2">{c.service}</span></td>
        <td className="p-2 text-xs">{CAMPAIGN_PLACEMENTS[c.placement as keyof typeof CAMPAIGN_PLACEMENTS] ?? c.placement}<span className="block">Priority {c.priority}</span></td>
        <td className="p-2 text-xs">{new Date(c.startsAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}<br />{new Date(c.endsAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</td>
        <td className="p-2 tabular-nums">{c.impressions} / {c.clicks}</td><td className="p-2 text-xs">{campaignStatus(c)}</td>
        <td className="p-2"><div className="flex gap-2">
          <button className={adminBtnOutline} disabled={!editable || busy} onClick={() => { setEditing(c); setVendorId(c.vendorId); setMessage(""); }}>Edit</button>
          <button className={adminBtnOutline} disabled={!editable || busy} onClick={() => void run(async () => { await adminJson(`/api/admin/campaigns/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) }); }, c.active ? "Campaign paused." : "Campaign enabled.")}>{c.active ? "Pause" : "Enable"}</button>
          <ConfirmAction triggerLabel="Remove" title="Remove campaign?" description="This deletes this placement and its counters. The vendor and service stay available." confirmLabel="Remove campaign" disabled={!editable || busy} onConfirm={async () => { await adminJson(`/api/admin/campaigns/${c.id}`, { method: "DELETE" }); setMessage("Campaign removed."); router.refresh(); }} />
        </div></td>
      </tr>)}</tbody></table></div>
      {!rows.length ? <p className="py-6 text-sm text-ink2">No sponsored campaigns yet.</p> : null}
    </Panel>
  </div>;
}
