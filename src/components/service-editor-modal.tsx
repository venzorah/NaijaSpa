"use client";
import { useToast, useToastMessage } from "@/components/vendor/toasts";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { EditorModal } from "@/components/admin/editor-modal";
import { FormRow, adminBtn, adminBtnOutline, adminField } from "@/components/admin/form-row";

export type ServiceEditorValue = {
  id: string; name: string; description: string; categoryId: string; imageUrl: string | null;
  basePriceKobo: number; durationMin: number; spaEnabled: boolean; hotelEnabled: boolean; homeEnabled: boolean;
  hotelAddonKobo: number; homeAddonKobo: number; vendorId?: string;
};
type Gallery = { id: string; title: string; images: { id: string; url: string; caption: string }[] };

export function ServiceEditorModal({ value, categories, vendors, admin = false, onClose, onSaved }: {
  value?: ServiceEditorValue; categories: { id: string; name: string }[];
  vendors?: { id: string; businessName: string }[]; admin?: boolean; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(value?.name ?? ""), [description, setDescription] = useState(value?.description ?? "");
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? categories[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(value?.vendorId ?? vendors?.[0]?.id ?? "");
  const [price, setPrice] = useState(String((value?.basePriceKobo ?? 2500000) / 100));
  const [duration, setDuration] = useState(String(value?.durationMin ?? 60));
  const [settings, setSettings] = useState({ spaEnabled: value?.spaEnabled ?? true, hotelEnabled: value?.hotelEnabled ?? true, homeEnabled: value?.homeEnabled ?? true });
  const [hotel, setHotel] = useState(String((value?.hotelAddonKobo ?? 0) / 100)), [home, setHome] = useState(String((value?.homeAddonKobo ?? 0) / 100));
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(value?.imageUrl ?? "");
  const [galleryId, setGalleryId] = useState(""), [removed, setRemoved] = useState(false);
  const [galleries, setGalleries] = useState<Gallery[]>([]), [showGallery, setShowGallery] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false), [galleryError, setGalleryError] = useToastMessage();
  const [busy, setBusy] = useState(false), [error, setError] = useToastMessage();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { setGalleries([]); setShowGallery(false); }, [vendorId]);
  async function browse() {
    setShowGallery(true); setGalleryLoading(true); setGalleryError("");
    try {
      const response = await fetch(admin ? `/api/admin/services/media?vendorId=${encodeURIComponent(vendorId)}` : "/api/vendor/galleries");
      if (!response.ok) throw new Error("Could not load the image gallery. Try again.");
      setGalleries((await response.json()).galleries ?? []);
    } catch (error) { setGalleryError(error instanceof Error ? error.message : "Could not load photos."); }
    finally { setGalleryLoading(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const body = { name, description, categoryId, basePriceKobo: Math.round(Number(price) * 100), durationMin: Number(duration), ...settings,
        hotelAddonKobo: Math.round(Number(hotel) * 100), homeAddonKobo: Math.round(Number(home) * 100),
        ...(value ? { id: value.id } : {}), ...(admin ? { vendorId } : {}), ...(galleryId ? { featuredImageId: galleryId } : {}), ...(removed ? { removeFeaturedImage: true } : {}) };
      const form = new FormData(); form.set("data", JSON.stringify(body)); if (file) form.set("file", file);
      const url = admin ? value ? `/api/admin/services/${value.id}` : "/api/admin/services" : "/api/vendor/services";
      const response = await fetch(url, { method: value ? "PATCH" : "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this service.");
      toast.success(value ? "Service updated." : "Service created.");
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save this service."); }
    finally { setBusy(false); }
  }
  function chooseFile(chosen: File | null) {
    if (!chosen) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(chosen.type) || chosen.size > 2 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, WebP or GIF image up to 2 MB."); if (input.current) input.current.value = ""; return;
    }
    setError(""); setFile(chosen); setGalleryId(""); setRemoved(false);
  }
  return <EditorModal title={value ? "Edit service" : "New service"} busy={busy} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      {admin && !value ? <FormRow label="Business" htmlFor="svc-business"><select required id="svc-business" className={adminField} value={vendorId} onChange={event => { setVendorId(event.target.value); setFile(null); setGalleryId(""); setPreview(""); }}><option value="">Select a business</option>{vendors?.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select></FormRow> : null}
      <div className="rounded-xl border border-line bg-elev/30 p-4"><label className="mb-2 block text-sm font-semibold" htmlFor="svc-featured">Featured image</label>
        {preview ? <div className="relative mb-3"><img src={preview} alt="Featured image preview" className="h-44 w-full rounded-lg object-cover" /><button type="button" aria-label="Remove featured image" onClick={() => { setFile(null); setGalleryId(""); setRemoved(true); setPreview(""); if (input.current) input.current.value = ""; }} className="absolute right-2 top-2 rounded-full bg-bg p-2 shadow"><X className="h-4 w-4" /></button></div> : <div className="mb-3 flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line text-ink2"><ImagePlus className="h-7 w-7" /><p className="text-xs">Add a photo of this treatment</p></div>}
        <input ref={input} id="svc-featured" aria-label="Upload featured image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => chooseFile(event.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap gap-2"><button type="button" className={adminBtnOutline} onClick={() => input.current?.click()}><Upload className="h-4 w-4" />Upload photo</button><button type="button" className={adminBtnOutline} disabled={admin && !vendorId} onClick={() => void browse()}>Choose from gallery</button></div><p className="mt-2 text-xs text-ink2">JPEG, PNG, WebP or GIF · up to 2 MB. Used on homepage cards, Explore and this service’s page.</p>
        {showGallery ? <div className="mt-3 border-t border-line pt-3">{galleryLoading ? <p role="status" className="flex items-center gap-2 text-xs"><LoaderCircle className="h-4 w-4 animate-spin" />Loading photos…</p> : galleryError ? <p role="alert" className="text-xs text-red-600">{galleryError}</p> : galleries.some(gallery => gallery.images.length) ? <div className="grid grid-cols-3 gap-2">{galleries.flatMap(gallery => gallery.images.map(image => <button type="button" key={image.id} aria-label={`Use gallery photo ${image.caption || image.id}`} onClick={() => { setFile(null); setGalleryId(image.id); setPreview(image.url); setRemoved(false); setShowGallery(false); }} className="overflow-hidden rounded-lg border border-line hover:border-gold"><img src={image.url} alt={image.caption || gallery.title} className="aspect-square w-full object-cover" /></button>))}</div> : <p className="text-xs text-ink2">No gallery photos yet. Upload a featured image above.</p>}</div> : null}
      </div>
      <FormRow label="Name" htmlFor="svc-name"><input id="svc-name" required minLength={2} maxLength={160} className={adminField} value={name} onChange={event => setName(event.target.value)} /></FormRow>
      <FormRow label="Category" htmlFor="svc-category"><select id="svc-category" required className={adminField} value={categoryId} onChange={event => setCategoryId(event.target.value)}>{value && !categories.some(category => category.id === categoryId) ? <option value={categoryId}>Current category (inactive)</option> : null}{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormRow>
      <FormRow label="Description" htmlFor="svc-description"><textarea id="svc-description" rows={3} maxLength={10000} className={adminField} value={description} onChange={event => setDescription(event.target.value)} /></FormRow>
      <div className="grid grid-cols-2 gap-3"><FormRow label="Price (₦)" htmlFor="svc-price"><input id="svc-price" type="number" min="0.01" step="0.01" required className={adminField} value={price} onChange={event => setPrice(event.target.value)} /></FormRow><FormRow label="Duration (min)" htmlFor="svc-duration"><input id="svc-duration" type="number" min={1} max={1440} required className={adminField} value={duration} onChange={event => setDuration(event.target.value)} /></FormRow><FormRow label="Hotel extra (₦)" htmlFor="svc-hotel"><input id="svc-hotel" type="number" min={0} step="0.01" required className={adminField} value={hotel} onChange={event => setHotel(event.target.value)} /></FormRow><FormRow label="Home extra (₦)" htmlFor="svc-home"><input id="svc-home" type="number" min={0} step="0.01" required className={adminField} value={home} onChange={event => setHome(event.target.value)} /></FormRow></div>
      <div className="flex flex-wrap gap-4 text-sm">{([['spaEnabled','Spa / Office'],['hotelEnabled','Hotel'],['homeEnabled','Home']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={settings[key]} onChange={event => setSettings(previous => ({ ...previous, [key]: event.target.checked }))} />{label}</label>)}</div>
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      <div className="flex items-center justify-end gap-2 border-t border-line pt-4"><button type="button" disabled={busy} onClick={onClose} className={adminBtnOutline}>Cancel</button><button type="submit" disabled={busy || !categoryId || (admin && !vendorId)} className={adminBtn}>{busy ? "Saving…" : "Save service"}</button></div>
    </form>
  </EditorModal>;
}
