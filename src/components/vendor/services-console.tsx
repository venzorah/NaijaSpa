"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Infinity as InfinityIcon, Pencil, Plus, Search } from "lucide-react";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { FilterChips } from "@/components/admin/filter-chips";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  basePriceKobo: number;
  durationMin: number;
  active: boolean;
  bookings: number;
  spaEnabled: boolean;
  hotelEnabled: boolean;
  homeEnabled: boolean;
  hotelAddonKobo: number;
  homeAddonKobo: number;
};

export function VendorServicesConsole({
  rows,
  categories
}: {
  rows: Row[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    categoryId: categories[0]?.id ?? "",
    description: "",
    basePriceNaira: "25000",
    durationMin: "60",
    hotelAddon: "0",
    homeAddon: "0",
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true
  });

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          (cat === "all" || s.category === cat) &&
          (!query || s.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [rows, cat, query]
  );
  const cats = ["all", ...Array.from(new Set(rows.map((s) => s.category)))];
  const grouped = cats
    .filter((c) => c !== "all")
    .map((c) => ({ category: c, items: filtered.filter((s) => s.category === c) }))
    .filter((g) => g.items.length);

  function startNew() {
    setEditing(null);
    setForm({
      name: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      basePriceNaira: "25000",
      durationMin: "60",
      hotelAddon: "0",
      homeAddon: "0",
      spaEnabled: true,
      hotelEnabled: true,
      homeEnabled: true
    });
    setOpen(true);
  }

  function startEdit(s: Row) {
    setEditing(s);
    setForm({
      name: s.name,
      categoryId: s.categoryId,
      description: s.description,
      basePriceNaira: String(Math.round(s.basePriceKobo / 100)),
      durationMin: String(s.durationMin),
      hotelAddon: String(Math.round(s.hotelAddonKobo / 100)),
      homeAddon: String(Math.round(s.homeAddonKobo / 100)),
      spaEnabled: s.spaEnabled,
      hotelEnabled: s.hotelEnabled,
      homeEnabled: s.homeEnabled
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        description: form.description,
        basePriceKobo: Math.round(Number(form.basePriceNaira) * 100),
        durationMin: Number(form.durationMin),
        hotelAddonKobo: Math.round(Number(form.hotelAddon) * 100),
        homeAddonKobo: Math.round(Number(form.homeAddon) * 100),
        spaEnabled: form.spaEnabled,
        hotelEnabled: form.hotelEnabled,
        homeEnabled: form.homeEnabled
      };
      if (editing) await adminJson("/api/vendor/services", { method: "PATCH", body: JSON.stringify({ id: editing.id, ...payload }) });
      else await adminJson("/api/vendor/services", { method: "POST", body: JSON.stringify(payload) });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Row, active: boolean) {
    await adminJson("/api/vendor/services", { method: "PATCH", body: JSON.stringify({ id: s.id, active }) });
    router.refresh();
  }

  return (
    <div>
      <VendorPageHeader
        title="Services"
        description="Create, price and organise everything you offer."
        actions={
          <button type="button" className={adminBtn} onClick={startNew}>
            <Plus className="h-4 w-4" /> New service
          </button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-sm text-ink2">Total services</p>
          <p className="font-display text-2xl">{rows.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-ink2">Active & bookable</p>
          <p className="font-display text-2xl">{rows.filter((s) => s.active).length}</p>
        </Panel>
        <Panel className="border-gold/40">
          <div className="flex items-center gap-3">
            <InfinityIcon className="h-6 w-6 text-goldink" aria-hidden />
            <div>
              <p className="text-sm font-medium">Unlimited listings</p>
              <p className="text-xs text-ink2">No plan caps — add as many as you like.</p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips
          label="Categories"
          value={cat}
          onChange={setCat}
          options={cats.map((c) => ({ value: c, label: c === "all" ? "All" : c }))}
        />
        <label className="relative w-full md:w-64">
          <span className="sr-only">Search services</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…" className="h-9 w-full rounded-lg border border-line bg-elev pl-9 pr-3 text-sm" />
        </label>
      </div>
      {grouped.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-sm text-ink2">No services found. Create a new service to get started.</p>
        </Panel>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.category}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink2">
                {g.category} <span className="rounded-full bg-elev px-1.5 font-mono">{g.items.length}</span>
              </h2>
              <Panel bodyClassName="divide-y divide-line p-0">
                {g.items.map((s) => (
                  <div key={s.id} className={cn("flex flex-col gap-3 p-4 md:flex-row md:items-center", !s.active && "opacity-60")}>
                    <div className="min-w-0 md:w-[38%]">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-ink2">
                        {s.durationMin} min · spa ₦0 extra · hotel +{formatNgn(s.hotelAddonKobo)} · home +{formatNgn(s.homeAddonKobo)}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2 text-xs text-ink2">
                      {s.spaEnabled ? <span className="rounded-md bg-elev px-2 py-0.5">Spa</span> : null}
                      {s.hotelEnabled ? <span className="rounded-md bg-elev px-2 py-0.5">Hotel</span> : null}
                      {s.homeEnabled ? <span className="rounded-md bg-elev px-2 py-0.5">Home</span> : null}
                      <span>{s.bookings} bookings</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="w-24 text-right font-display text-lg">{formatNgn(s.basePriceKobo)}</p>
                      {!s.active ? <AdminStatusPill status="Inactive" /> : null}
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={s.active} onChange={(e) => toggle(s, e.target.checked)} />
                        Live
                      </label>
                      <button type="button" className={adminBtnOutline} aria-label={`Edit ${s.name}`} onClick={() => startEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </Panel>
            </section>
          ))}
        </div>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="svc-editor">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-5">
            <h2 id="svc-editor" className="font-display text-xl">
              {editing ? "Edit service" : "New service"}
            </h2>
            <div className="mt-4 grid gap-3">
              <FormRow label="Name" htmlFor="svc-name">
                <input id="svc-name" className={adminField} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormRow>
              <FormRow label="Category" htmlFor="svc-cat">
                <select id="svc-cat" className={adminField} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Description" htmlFor="svc-desc">
                <textarea id="svc-desc" className={adminField} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Price ₦" htmlFor="svc-price">
                  <input id="svc-price" type="number" min={0} className={adminField} value={form.basePriceNaira} onChange={(e) => setForm({ ...form, basePriceNaira: e.target.value })} />
                </FormRow>
                <FormRow label="Duration (min)" htmlFor="svc-dur">
                  <input id="svc-dur" type="number" min={15} className={adminField} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
                </FormRow>
                <FormRow label="Hotel add-on ₦" htmlFor="svc-hotel">
                  <input id="svc-hotel" type="number" min={0} className={adminField} value={form.hotelAddon} onChange={(e) => setForm({ ...form, hotelAddon: e.target.value })} />
                </FormRow>
                <FormRow label="Home add-on ₦" htmlFor="svc-home">
                  <input id="svc-home" type="number" min={0} className={adminField} value={form.homeAddon} onChange={(e) => setForm({ ...form, homeAddon: e.target.value })} />
                </FormRow>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.spaEnabled} onChange={(e) => setForm({ ...form, spaEnabled: e.target.checked })} /> Spa / office
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.hotelEnabled} onChange={(e) => setForm({ ...form, hotelEnabled: e.target.checked })} /> Hotel
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.homeEnabled} onChange={(e) => setForm({ ...form, homeEnabled: e.target.checked })} /> Home
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={adminBtnOutline} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={adminBtn} disabled={busy || form.name.length < 2} onClick={save}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
