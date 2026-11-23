"use client";

import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/money";

type Product = { id: string; name: string; status: string; variants: { priceKobo: number }[] };
type Category = { id: string; name: string };

export function VendorProductForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/shop/vendor/products").then((r) => r.json()).then((d) => {
      setProducts(d.products ?? []);
      setCategories(d.categories ?? []);
    }).catch(() => undefined);
  }, []);
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <form
        className="grid gap-2 rounded-3xl border border-line bg-card p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const res = await fetch("/api/shop/vendor/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              description: fd.get("description"),
              categoryId: fd.get("categoryId"),
              ingredients: fd.get("ingredients"),
              usage: fd.get("usage"),
              warnings: fd.get("warnings"),
              expiryNote: fd.get("expiryNote"),
              nafdacNumber: fd.get("nafdacNumber"),
              images: String(fd.get("images") || "").split(/\s+/).filter(Boolean),
              variants: [{ sku: fd.get("sku"), name: fd.get("variantName") || "Default", priceKobo: Number(fd.get("priceNaira")) * 100, compareKobo: Number(fd.get("compareNaira") || 0) * 100, stockOnHand: Number(fd.get("stock")) }]
            })
          });
          const data = await res.json();
          setMessage(res.ok ? "Saved for admin approval." : data.error || "Could not save");
          if (res.ok) {
            form.reset();
            const refresh = await fetch("/api/shop/vendor/products");
            const next = await refresh.json();
            setProducts(next.products ?? []);
          }
        }}
      >
        <input required name="name" placeholder="Product name" className="h-10 rounded-xl border border-line px-3" />
        <select required name="categoryId" className="h-10 rounded-xl border border-line px-3">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <textarea name="description" placeholder="Description" className="rounded-xl border border-line p-3" />
        <input name="ingredients" placeholder="Ingredients" className="h-10 rounded-xl border border-line px-3" />
        <input name="usage" placeholder="Usage" className="h-10 rounded-xl border border-line px-3" />
        <input name="warnings" placeholder="Warnings" className="h-10 rounded-xl border border-line px-3" />
        <input name="expiryNote" placeholder="Expiry" className="h-10 rounded-xl border border-line px-3" />
        <input name="nafdacNumber" placeholder="NAFDAC number if required" className="h-10 rounded-xl border border-line px-3" />
        <input name="images" placeholder="Image URLs, space-separated" className="h-10 rounded-xl border border-line px-3" />
        <input required name="sku" placeholder="SKU" className="h-10 rounded-xl border border-line px-3" />
        <input name="variantName" placeholder="Variant name" defaultValue="Default" className="h-10 rounded-xl border border-line px-3" />
        <input required name="priceNaira" type="number" placeholder="Price ₦" className="h-10 rounded-xl border border-line px-3" />
        <input name="compareNaira" type="number" placeholder="Compare-at ₦" className="h-10 rounded-xl border border-line px-3" />
        <input required name="stock" type="number" placeholder="Stock" className="h-10 rounded-xl border border-line px-3" />
        <button className="h-10 rounded-full bg-gold font-bold text-ongold">Save product</button>
        {message ? <p className="text-sm text-goldink">{message}</p> : null}
      </form>
      <ul className="space-y-2 text-sm">
        {products.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            {p.name} · {p.status} · {p.variants[0] ? formatNgn(p.variants[0].priceKobo) : ""}
          </li>
        ))}
        {!products.length ? <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink2">No products yet. Save one for admin approval.</li> : null}
      </ul>
    </div>
  );
}
