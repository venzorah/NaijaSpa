"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; description: string; sortOrder: number; active: boolean };

export function ShopCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const res = await fetch("/api/admin/shop/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }
  useEffect(() => {
    load().catch(() => setCategories([]));
  }, []);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form
        className="grid gap-2 rounded-[1.5rem] border border-line bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/admin/shop/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              description: fd.get("description"),
              sortOrder: Number(fd.get("sortOrder") || 0),
              active: fd.get("active") === "on"
            })
          });
          setMessage(res.ok ? "Category saved." : "Could not save");
          if (res.ok) {
            e.currentTarget.reset();
            await load();
          }
        }}
      >
        <p className="font-semibold">Add category</p>
        <input required name="name" placeholder="Name" className="h-11 rounded-2xl border border-line px-3" />
        <textarea name="description" placeholder="Description" className="rounded-2xl border border-line p-3 text-sm" />
        <input name="sortOrder" type="number" defaultValue={0} className="h-11 rounded-2xl border border-line px-3" />
        <label className="text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <button className="h-11 rounded-full bg-gold text-sm font-bold text-ongold">Save</button>
        {message ? <p className="text-sm text-goldink">{message}</p> : null}
      </form>
      <ul className="space-y-2 text-sm">
        {categories.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            {c.sortOrder}. {c.name} {c.active ? "" : "(disabled)"}
          </li>
        ))}
        {!categories.length ? <li className="text-ink2">No categories yet. Seed runs when the database is reachable.</li> : null}
      </ul>
    </div>
  );
}
