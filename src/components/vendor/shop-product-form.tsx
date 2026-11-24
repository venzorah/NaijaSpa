"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { formatNgn } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  status: string;
  seoTitle?: string;
  metaDescription?: string;
  images: { url: string; sortOrder: number }[];
  variants: { priceKobo: number }[];
};
type Category = { id: string; name: string };

function ImageSlot({
  label,
  required,
  value,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/shop/vendor/product-images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload image.");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold">
        {label}
        {required ? <span className="text-goldink"> *</span> : null}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-elev"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-ink2">
            <ImagePlus className="h-5 w-5" aria-hidden />
            {busy ? "Uploading…" : "Upload"}
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {value ? (
        <button type="button" className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink2" onClick={() => onChange("")}>
          <X className="h-3 w-3" aria-hidden /> Remove
        </button>
      ) : null}
      {error ? <p role="alert" className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

export function VendorProductForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [featured, setFeatured] = useState("");
  const [gallery, setGallery] = useState<[string, string]>(["", ""]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/shop/vendor/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        setCategories(d.categories ?? []);
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <form
        className="grid gap-3 rounded-3xl border border-line bg-card p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = e.currentTarget;
          const fd = new FormData(form);
          const images = [featured, gallery[0], gallery[1]].filter(Boolean);
          setBusy(true);
          setMessage("");
          const res = await fetch("/api/shop/vendor/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              seoTitle: fd.get("seoTitle"),
              metaDescription: fd.get("metaDescription"),
              description: fd.get("description"),
              categoryId: fd.get("categoryId"),
              ingredients: fd.get("ingredients"),
              usage: fd.get("usage"),
              warnings: fd.get("warnings"),
              expiryNote: fd.get("expiryNote"),
              nafdacNumber: fd.get("nafdacNumber"),
              images,
              variants: [
                {
                  sku: fd.get("sku"),
                  name: fd.get("variantName") || "Default",
                  priceKobo: Number(fd.get("priceNaira")) * 100,
                  compareKobo: Number(fd.get("compareNaira") || 0) * 100,
                  stockOnHand: Number(fd.get("stock"))
                }
              ]
            })
          });
          const data = await res.json();
          setBusy(false);
          setMessage(res.ok ? "Saved for admin approval." : data.error || "Could not save");
          if (res.ok) {
            form.reset();
            setFeatured("");
            setGallery(["", ""]);
            const refresh = await fetch("/api/shop/vendor/products");
            const next = await refresh.json();
            setProducts(next.products ?? []);
          }
        }}
      >
        <input required name="name" placeholder="Product name" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <select required name="categoryId" className="h-11 rounded-xl border border-line px-3 text-sm">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div>
          <p className="text-xs font-semibold">Photos</p>
          <p className="mt-0.5 text-[11px] text-ink2">Upload a featured image and up to two gallery photos. File upload only, 2 MB max.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ImageSlot label="Featured" required value={featured} onChange={setFeatured} />
            <ImageSlot label="Gallery 1" value={gallery[0]} onChange={(url) => setGallery([url, gallery[1]])} />
            <ImageSlot label="Gallery 2" value={gallery[1]} onChange={(url) => setGallery([gallery[0], url])} />
          </div>
        </div>
        <label className="block text-xs font-semibold">
          SEO title
          <input name="seoTitle" maxLength={70} placeholder="Search title (70 characters)" className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm font-normal" />
        </label>
        <label className="block text-xs font-semibold">
          Meta description
          <textarea name="metaDescription" maxLength={320} rows={3} placeholder="Short search snippet (320 characters)" className="mt-1 w-full rounded-xl border border-line p-3 text-sm font-normal" />
        </label>
        <textarea name="description" placeholder="Product description" className="rounded-xl border border-line p-3 text-sm" rows={4} />
        <input name="ingredients" placeholder="Ingredients" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <input name="usage" placeholder="Usage" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <input name="warnings" placeholder="Warnings" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <input name="expiryNote" placeholder="Expiry" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <input name="nafdacNumber" placeholder="NAFDAC number if required" className="h-11 rounded-xl border border-line px-3 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input required name="sku" placeholder="SKU" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <input name="variantName" placeholder="Variant name" defaultValue="Default" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <input required name="priceNaira" type="number" placeholder="Price ₦" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <input name="compareNaira" type="number" placeholder="Compare-at ₦" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <input required name="stock" type="number" placeholder="Stock" className="col-span-2 h-11 rounded-xl border border-line px-3 text-sm" />
        </div>
        <button disabled={busy} className="h-11 rounded-full bg-gold text-sm font-bold text-ongold disabled:opacity-60">
          {busy ? "Saving…" : "Save product"}
        </button>
        {message ? <p className="text-sm text-goldink">{message}</p> : null}
      </form>
      <ul className="space-y-2">
        {products.map((p) => {
          const cover = [...(p.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url;
          return (
            <li key={p.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-elev">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink2">
                  {p.status} · {p.variants[0] ? formatNgn(p.variants[0].priceKobo) : ""}
                </p>
                {p.seoTitle ? <p className="mt-1 line-clamp-1 text-[11px] text-ink2">{p.seoTitle}</p> : null}
              </div>
            </li>
          );
        })}
        {!products.length ? (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink2">No products yet. Save one for admin approval.</li>
        ) : null}
      </ul>
    </div>
  );
}
