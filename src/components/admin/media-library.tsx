"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Images, Trash2, Upload } from "lucide-react";
import { notifyAction } from "@/lib/action-feedback";
import { adminJson } from "./json";
import { adminBtn, adminBtnOutline, adminField } from "./form-row";
import { ConfirmAction } from "./confirm-action";

type Item = { id: string | null; url: string; name: string; sources: string[]; uses: number };
type Payload = { items: Item[]; total: number; pages: number; page: number; cleanupPending: number };
const removalDescription = "Remove the images from this library and their banners, adverts, listings and galleries. Adverts using them are paused. Uploaded files are deleted; built-in artwork is hidden from the library. Listings and bookings are kept.";

export function AdminMediaLibrary({ onSelect }: { onSelect?: (url: string) => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState(""), [source, setSource] = useState("all"), [page, setPage] = useState(1);
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, Item>>({});
  const picker = useRef<HTMLInputElement>(null), chosen = Object.values(selected);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await adminJson<Payload>(`/api/admin/media?${new URLSearchParams({ q, source, page: String(page) })}`, { signal });
    if (page > result.pages) { setPage(result.pages); return; }
    setData(result);
  }, [q, source, page]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => { void load(controller.signal).catch(error => { if (!controller.signal.aborted) setMessage(error.message); }); }, 200); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  async function upload(file?: File) {
    if (!file || busy) return; setBusy(true); setMessage("");
    try { const fd = new FormData(); fd.set("file", file); const response = await fetch("/api/admin/media", { method: "POST", body: fd }); const json = await response.json(); if (!response.ok) throw Error(json.error || "Upload failed."); setMessage("Image uploaded to your library."); notifyAction("success", "Image uploaded to your library."); if (onSelect) onSelect(json.asset.url); else if (page !== 1) setPage(1); else await load(); }
    catch (error) { const text = error instanceof Error ? error.message : "Upload failed."; setMessage(text); notifyAction("error", text); }
    finally { setBusy(false); if (picker.current) picker.current.value = ""; }
  }
  async function remove(items: Item[]) {
    setBusy(true);
    try {
      const result = await adminJson<{ deleted: number; cleanupPending: number }>("/api/admin/media", { method: "DELETE", body: JSON.stringify({ urls: items.map(item => item.url) }) });
      const removed = new Set(items.map(item => item.url));
      setSelected(previous => Object.fromEntries(Object.entries(previous).filter(([url]) => !removed.has(url))));
      setData(previous => previous ? { ...previous, items: previous.items.filter(item => !removed.has(item.url)) } : previous);
      const text = result.cleanupPending ? "Images removed. Some storage cleanup needs a retry." : `${result.deleted} image${result.deleted === 1 ? "" : "s"} deleted.`;
      setMessage(text); notifyAction(result.cleanupPending ? "info" : "success", text); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete images."); throw error; }
    finally { setBusy(false); }
  }
  async function retryCleanup() {
    setBusy(true);
    try { const result = await adminJson<{ cleanupPending: number }>("/api/admin/media", { method: "DELETE", body: JSON.stringify({ retryCleanup: true }) }); const text = result.cleanupPending ? "Some storage cleanup is still pending. Please try again later." : "Storage cleanup completed."; setMessage(text); notifyAction(result.cleanupPending ? "info" : "success", text); await load(); }
    catch { /* adminJson shows the error toast. */ } finally { setBusy(false); }
  }
  const allPageSelected = Boolean(data?.items.length && data.items.every(item => selected[item.url]));
  return <div className="space-y-4">
    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label="Upload library image" disabled={busy} onChange={event => void upload(event.target.files?.[0])} />
    <div className="flex flex-wrap gap-3"><input aria-label="Search images" disabled={busy} className={adminField} placeholder="Search images or business names" value={q} onChange={event => { setQ(event.target.value); setPage(1); }} /><select aria-label="Image source" disabled={busy} className={adminField} value={source} onChange={event => { setSource(event.target.value); setPage(1); }}>{["all", "Uploads", "Homepage", "Vendor galleries", "Business profiles", "Services", "Categories", "Therapists", "Default images"].map(value => <option key={value} value={value}>{value === "all" ? "All images" : value}</option>)}</select><button type="button" className={adminBtn} disabled={busy} onClick={() => picker.current?.click()}><Upload className="h-4 w-4" />Upload image</button></div>
    <p className="text-xs text-ink2">JPEG, PNG, WebP or GIF · up to 2 MB. Private identity and verification documents are excluded.</p>
    {message ? <p role="status" className="rounded-xl border border-line bg-elev p-3 text-sm">{message}</p> : null}
    {data ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-elev p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Select all images on this page" disabled={busy || !data.items.length} checked={allPageSelected} onChange={() => setSelected(previous => { const next = { ...previous }; for (const item of data.items) { if (allPageSelected) delete next[item.url]; else if (Object.keys(next).length < 100) next[item.url] = item; } return next; })} />Select page</label><span className="text-xs text-ink2">{data.total} images · {chosen.length} selected</span><div className="flex flex-wrap gap-2">
        {chosen.length ? <><button type="button" className={adminBtnOutline} disabled={busy} onClick={() => setSelected({})}>Clear selection</button><ConfirmAction triggerLabel={`Delete selected (${chosen.length})`} triggerIcon={Trash2} triggerClassName="border-red-300 text-red-600" disabled={busy} title={`Delete ${chosen.length} selected images?`} description={removalDescription} impact={chosen.slice(0, 8).map(item => `${item.name}: ${item.uses} attachments`)} confirmLabel="Delete selected images" onConfirm={() => remove(chosen)} /></> : null}
        {data.cleanupPending > 0 ? <button type="button" className={adminBtnOutline} disabled={busy} onClick={() => void retryCleanup()}>Retry storage cleanup ({data.cleanupPending})</button> : null}
      </div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{data.items.map(item => <article key={item.url} className={`overflow-hidden rounded-2xl border bg-card ${selected[item.url] ? "border-gold ring-1 ring-gold" : "border-line"}`}>
        <div className="relative"><a href={item.url} target="_blank" rel="noreferrer"><img loading="lazy" src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" /></a><label className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card shadow-sm"><input type="checkbox" aria-label={`Select ${item.name}`} checked={Boolean(selected[item.url])} disabled={busy || (!selected[item.url] && chosen.length >= 100)} onChange={() => setSelected(previous => { const next = { ...previous }; if (next[item.url]) delete next[item.url]; else next[item.url] = item; return next; })} /></label></div>
        <div className="space-y-2 p-3"><p className="truncate text-sm font-semibold" title={item.name}>{item.name}</p><p className="text-[11px] text-ink2">{item.sources.join(" · ")}</p><div className="flex flex-wrap gap-2">
          {onSelect ? <button type="button" className={adminBtnOutline} disabled={busy} onClick={() => onSelect(item.url)}>Use image</button> : <button type="button" className={adminBtnOutline} disabled={busy} onClick={() => { void navigator.clipboard.writeText(new URL(item.url, location.origin).href).then(() => notifyAction("success", "Image link copied.")).catch(() => notifyAction("error", "Could not copy the link. Open the image to copy its address.")); }}>Copy link</button>}
          <ConfirmAction triggerLabel="Delete image" triggerIcon={Trash2} triggerClassName="border-red-300 text-red-600" disabled={busy} title="Delete this image?" description={removalDescription} impact={[`${item.name}: ${item.uses} attachments`]} confirmLabel="Delete image" onConfirm={() => remove([item])} />
        </div>{item.uses > 0 ? <p className="text-[10px] text-ink2">Used in {item.uses} place{item.uses === 1 ? "" : "s"}</p> : null}</div>
      </article>)}</div>
      {!data.items.length ? <p className="py-8 text-center text-ink2"><Images className="mx-auto mb-3" />No images match your search.</p> : null}
      <div className="flex items-center justify-between"><button type="button" className={adminBtnOutline} disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-xs">Page {page} of {data.pages}</span><button type="button" className={adminBtnOutline} disabled={busy || page >= data.pages} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </> : <p>Loading images…</p>}
  </div>;
}
