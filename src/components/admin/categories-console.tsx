"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderPlus, FolderTree, Save } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EditorModal } from "@/components/admin/editor-modal";
import { adminBtn, adminBtnOutline, adminField } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { categoryImage } from "@/lib/category-images";

export type AdminCategory = { id: string; name: string; slug: string; description: string; synonyms: string; metaTitle: string; metaDescription: string; imageUrl: string | null; active: boolean; services: number; vendors: number };
const empty: AdminCategory = { id: "", name: "", slug: "", description: "", synonyms: "", metaTitle: "", metaDescription: "", imageUrl: null, active: false, services: 0, vendors: 0 };
const steps = ["Details", "Image", "Search & publish"];
export function CategoriesConsole({ rows, editable }: { rows: AdminCategory[]; editable: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(rows), [draft, setDraft] = useState<AdminCategory | null>(null);
  const [step, setStep] = useState(0), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setList(rows), [rows]);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] input:not([disabled]), [data-step="${step}"] textarea:not([disabled])`)?.focus(); }, [step]);
  function open(category: AdminCategory) { setDraft({ ...category }); setStep(0); setFile(null); setMessage(""); }
  function change<K extends keyof AdminCategory>(key: K, value: AdminCategory[K]) { setDraft(current => current ? { ...current, [key]: value } : null); }
  async function run(fn: () => Promise<void>, success: string) {
    if (busy) return; setBusy(true); setMessage("");
    try { await fn(); setMessage(success); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); }
    finally { setBusy(false); }
  }
  function move(index: number, dir: number) { const next = [...list]; [next[index], next[index + dir]] = [next[index + dir], next[index]]; setList(next); }
  function next() {
    const controls = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] textarea`);
    for (const control of controls ?? []) if (!control.reportValidity()) return;
    setStep(value => Math.min(2, value + 1));
  }
  return <>
    {message && !draft ? <p role="status" className="mb-3 text-sm text-goldink">{message}</p> : null}
    <Panel title="Categories" description="Create categories, manage their images and choose their display order." bodyClassName="p-0">
      <div className="flex flex-wrap justify-end gap-2 border-b border-line p-3"><button className={adminBtnOutline} disabled={!editable || busy || !list.length} onClick={() => void run(async () => { await adminJson(`/api/admin/categories/${list[0].id}`, { method: "PATCH", body: JSON.stringify({ order: list.map(c => c.id) }) }); }, "Display order published.")}><Save className="h-3.5 w-3.5" />Publish order</button><button className={adminBtn} disabled={!editable || busy} onClick={() => open(empty)}><FolderPlus className="h-3.5 w-3.5" />New category</button></div>
      {!list.length ? <EmptyState icon={FolderTree} title="No categories" text="Create your first category to organise services." /> : <ol className="divide-y divide-line">{list.map((category, i) => <li key={category.id} className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs text-ink2">{i + 1}</span><div className="flex flex-col"><button aria-label={`Move ${category.name} up`} disabled={!editable || busy || i === 0} onClick={() => move(i, -1)} className="rounded p-1 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button><button aria-label={`Move ${category.name} down`} disabled={!editable || busy || i === list.length - 1} onClick={() => move(i, 1)} className="rounded p-1 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={categoryImage(category.slug, category.imageUrl)} alt="" className="h-12 w-12 rounded-xl object-cover" />
        <button className="min-w-0 flex-1 text-left" disabled={busy} onClick={() => open(category)}><span className="block text-sm font-medium">{category.name}</span><span className="text-xs text-ink2">{category.services} services · {category.vendors} vendors</span></button>
        <AdminStatusPill status={category.active ? "Active" : "Inactive"} />
        <button className={adminBtnOutline} disabled={busy} onClick={() => open(category)}>{editable ? "Edit" : "View"}</button>
        <ConfirmAction triggerLabel={category.active ? "Deactivate" : "Activate"} title={`${category.active ? "Deactivate" : "Activate"} ${category.name}?`} description={category.active ? "The category will be hidden from public category navigation." : "The category will appear in public category navigation."} confirmLabel={category.active ? "Deactivate category" : "Activate category"} disabled={!editable || busy} onConfirm={() => run(async () => { await adminJson(`/api/admin/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ active: !category.active }) }); }, "Category status updated.")} />
      </li>)}</ol>}
    </Panel>
    {draft ? <EditorModal title={draft.id ? `Edit category · ${draft.name}` : "New category"} busy={busy} onClose={() => { setDraft(null); setFile(null); }}>
      <ol aria-label="Category steps" className="mb-5 grid grid-cols-3 gap-2">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={`rounded-xl border p-2 text-xs ${index === step ? "border-gold bg-gold/10 font-semibold text-goldink" : "border-line text-ink2"}`}>{index + 1}. {label}</li>)}</ol>
      <form ref={formRef} className="space-y-4" onSubmit={event => {
        event.preventDefault(); if (!editable) return;
        if (step < 2) { next(); return; }
        void run(async () => {
          const body = new FormData();
          for (const key of ["name", "slug", "description", "synonyms", "metaTitle", "metaDescription"] as const) body.set(key, draft[key]);
          body.set("imageUrl", draft.imageUrl ?? ""); body.set("active", String(draft.active)); if (file) body.set("file", file);
          const response = await fetch(draft.id ? `/api/admin/categories/${draft.id}` : "/api/admin/categories", { method: draft.id ? "PATCH" : "POST", body });
          const json = await response.json(); if (!response.ok) throw new Error(json.error || "Could not save category");
          setDraft(null); setFile(null);
        }, draft.id ? "Category saved." : "Category created.");
      }}>
        {message ? <p role="status" className="text-sm text-goldink">{message}</p> : null}
        <fieldset disabled={!editable || busy} data-step="0" hidden={step !== 0} className="space-y-3">
          <label className="block text-sm">Name<input data-initial-focus required minLength={2} maxLength={80} name="name" className={`${adminField} mt-1`} value={draft.name} onChange={e => change("name", e.target.value)} /></label>
          <label className="block text-sm">URL slug<input name="slug" required={Boolean(draft.id)} minLength={2} maxLength={80} className={`${adminField} mt-1`} placeholder="Generated from the name if left blank" value={draft.slug} onChange={e => change("slug", e.target.value)} /></label>
          <label className="block text-sm">Description<textarea name="description" rows={3} maxLength={2000} className={`${adminField} mt-1`} value={draft.description} onChange={e => change("description", e.target.value)} /></label>
        </fieldset>
        <fieldset disabled={!editable || busy} data-step="1" hidden={step !== 1} className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview || categoryImage(draft.slug, draft.imageUrl)} alt="Category preview" className="h-44 w-full rounded-xl object-cover" />
          <label className="block text-sm">Category image<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-2 block w-full text-sm" onChange={e => { const value = e.target.files?.[0]; if (!value) return; if (value.size > 2 * 1024 * 1024) { setMessage("Each category image must be at most 2 MB"); e.target.value = ""; return; } setMessage(""); setFile(value); }} /></label>
          <p className="text-xs text-ink2">JPEG, PNG, WebP or GIF · 2 MB maximum. Uploads are saved only when you finish.</p>
          {file ? <button type="button" className={adminBtnOutline} onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>Clear selected image</button> : null}
          <label className="block text-sm">Or image URL<input name="imageUrl" maxLength={500} className={`${adminField} mt-1`} value={draft.imageUrl ?? ""} onChange={e => change("imageUrl", e.target.value)} /></label>
        </fieldset>
        <fieldset disabled={!editable || busy} data-step="2" hidden={step !== 2} className="space-y-3">
          <label className="block text-sm">Search synonyms<input name="synonyms" maxLength={400} className={`${adminField} mt-1`} value={draft.synonyms} onChange={e => change("synonyms", e.target.value)} /></label>
          <label className="block text-sm">Meta title<input name="metaTitle" maxLength={80} className={`${adminField} mt-1`} value={draft.metaTitle} onChange={e => change("metaTitle", e.target.value)} /></label>
          <label className="block text-sm">Meta description<textarea name="metaDescription" maxLength={320} rows={3} className={`${adminField} mt-1`} value={draft.metaDescription} onChange={e => change("metaDescription", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => change("active", e.target.checked)} />Active — show this category publicly</label>
          <p className="rounded-xl border border-line bg-elev p-3 text-sm">{draft.name || "New category"} · {draft.active ? "Will be visible publicly" : "Saved as an inactive draft"}{file ? " · New image selected" : ""}</p>
        </fieldset>
        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4"><button type="button" className={adminBtnOutline} disabled={busy} onClick={() => { setDraft(null); setFile(null); }}>Cancel</button><div className="flex gap-2">{step > 0 ? <button type="button" className={adminBtnOutline} disabled={busy} onClick={() => setStep(value => value - 1)}>Back</button> : null}{step < 2 ? <button type="button" className={adminBtn} disabled={busy} onClick={next}>Next</button> : editable ? <button className={adminBtn} disabled={busy}>{busy ? "Saving…" : draft.id ? "Save changes" : "Create category"}</button> : null}</div></div>
      </form>
    </EditorModal> : null}
  </>;
}
