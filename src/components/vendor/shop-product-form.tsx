"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { formatNgn } from "@/lib/money";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";
import { SHOP_PRODUCT_IMAGE_BYTES, shopProductImageLimitLabel, shopProductImageTooLargeMessage } from "@/lib/shop/product-media";
import { ShopProductImage } from "@/components/shop/product-image";

type Product = {
  id: string;
  name: string;
  status: string;
  seoTitle?: string;
  metaDescription?: string;
  images: { url: string; sortOrder: number }[];
  variants?: { priceKobo: number }[];
};
type Category = { id: string; name: string };

function ImageSlot({
  label,
  required,
  value,
  onChange,
  imageUrl = "/api/shop/vendor/product-images",
  extra,
  maxBytes
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  imageUrl?: string;
  extra?: Record<string, string>;
  maxBytes: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > maxBytes) {
      const text = shopProductImageTooLargeMessage(maxBytes);
      setError(text);
      shopError(text);
      if (input.current) input.current.value = "";
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      Object.entries(extra || {}).forEach(([key, val]) => fd.set(key, val));
      const res = await fetch(imageUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload image.");
      onChange(data.url);
      shopSuccess("Photo uploaded.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Could not upload image.";
      setError(text);
      shopError(text);
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
          <ShopProductImage src={value} alt="" className="h-full w-full" />
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

export function VendorProductForm({
  loadUrl = "/api/shop/vendor/products",
  saveUrl = "/api/shop/vendor/products",
  imageUrl = "/api/shop/vendor/product-images",
  extraBody,
  extraImage
}: {
  loadUrl?: string;
  saveUrl?: string;
  imageUrl?: string;
  extraBody?: Record<string, unknown>;
  extraImage?: Record<string, string>;
} = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [featured, setFeatured] = useState("");
  const [gallery, setGallery] = useState<[string, string]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [maxBytes, setMaxBytes] = useState(SHOP_PRODUCT_IMAGE_BYTES);
  useEffect(() => {
    fetch(loadUrl)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        setCategories(d.categories ?? []);
        if (typeof d.maxImageBytes === "number") setMaxBytes(d.maxImageBytes);
      })
      .catch(() => undefined);
  }, [loadUrl]);
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
          try {
            const res = await fetch(saveUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...extraBody,
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
            if (!res.ok) throw new Error(data.error || "Could not save");
            form.reset();
            setFeatured("");
            setGallery(["", ""]);
            const refresh = await fetch(loadUrl);
            const next = await refresh.json();
            setProducts(next.products ?? []);
            setMessage("Saved for admin approval. You can list another product here.");
            shopSuccess("Product saved. It stays here until Admin approves it for Shop.");
            document.getElementById("my-shop-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (err) {
            const text = err instanceof Error ? err.message : "Could not save";
            setMessage(text);
            shopError(text);
          } finally {
            setBusy(false);
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
          <p className="mt-0.5 text-[11px] text-ink2">
            Upload a featured image and up to two gallery photos. File upload only, {shopProductImageLimitLabel(maxBytes)} max.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ImageSlot label="Featured" required value={featured} onChange={setFeatured} imageUrl={imageUrl} extra={extraImage} maxBytes={maxBytes} />
            <ImageSlot label="Gallery 1" value={gallery[0]} onChange={(url) => setGallery([url, gallery[1]])} imageUrl={imageUrl} extra={extraImage} maxBytes={maxBytes} />
            <ImageSlot label="Gallery 2" value={gallery[1]} onChange={(url) => setGallery([gallery[0], url])} imageUrl={imageUrl} extra={extraImage} maxBytes={maxBytes} />
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
          <input required name="priceNaira" type="number" min="1" placeholder="Regular price ₦" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <input name="compareNaira" type="number" min="0" placeholder="Sales price ₦ (slashed)" className="h-11 rounded-xl border border-line px-3 text-sm" />
          <p className="col-span-2 text-[11px] text-ink2">Sales price is the slashed figure on Shop. Enter it only when it is higher than regular.</p>
          <input required name="stock" type="number" placeholder="Stock" className="col-span-2 h-11 rounded-xl border border-line px-3 text-sm" />
        </div>
        <button disabled={busy} className="h-11 rounded-full bg-gold text-sm font-bold text-ongold disabled:opacity-60">
          {busy ? "Saving…" : "Save product"}
        </button>
        {message ? <p className={`text-sm ${message.startsWith("Saved") ? "text-goldink" : "text-red-600"}`}>{message}</p> : null}
      </form>
      <ul id="my-shop-products" className="space-y-2">
        {products.map((p) => {
          const cover = [...(p.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url;
          return (
            <li key={p.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-elev">
                {cover ? <ShopProductImage src={cover} alt="" className="h-full w-full" padded={false} /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink2">
                  {p.status} · {p.variants?.[0] ? formatNgn(p.variants[0].priceKobo) : ""}
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
