"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Infinity as InfinityIcon, Pencil, Plus, Search } from "lucide-react";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { FilterChips } from "@/components/admin/filter-chips";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { ServiceEditorModal } from "@/components/service-editor-modal";
import { cn } from "@/lib/cn";
type Row = {
    id: string;
    slug: string;
    imageUrl: string | null;
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
export function VendorServicesConsole({ rows, categories }: {
    rows: Row[];
    categories: {
        id: string;
        name: string;
    }[];
}) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [cat, setCat] = useState("all");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);
    const filtered = useMemo(() => rows.filter((s) => (cat === "all" || s.category === cat) &&
        (!query || s.name.toLowerCase().includes(query.toLowerCase()))), [rows, cat, query]);
    const cats = ["all", ...Array.from(new Set(rows.map((s) => s.category)))];
    const grouped = cats
        .filter((c) => c !== "all")
        .map((c) => ({ category: c, items: filtered.filter((s) => s.category === c) }))
        .filter((g) => g.items.length);
    function startNew() { setEditing(null); setOpen(true); }
    function startEdit(row: Row) { setEditing(row); setOpen(true); }
    async function toggle(s: Row, active: boolean) {
        await adminJson("/api/vendor/services", { method: "PATCH", body: JSON.stringify({ id: s.id, active }) });
        router.refresh();
    }
    return (<div>
      <VendorPageHeader title="Services" description="Create, price and organise everything you offer." actions={<button type="button" className={adminBtn} disabled={!categories.length} onClick={startNew}>
            <Plus className="h-4 w-4"/> New service
          </button>}/>
      {!categories.length ? (<p className="mb-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink2">
          Categories are not live yet. Ask NaijaSpa admin to publish at least one category before you add treatments.
        </p>) : null}
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
            <InfinityIcon className="h-6 w-6 text-goldink" aria-hidden/>
            <div>
              <p className="text-sm font-medium">Unlimited listings</p>
              <p className="text-xs text-ink2">No plan caps — add as many as you like.</p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips label="Categories" value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c === "all" ? "All" : c }))}/>
        <label className="relative w-full md:w-64">
          <span className="sr-only">Search services</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…" className="h-9 w-full rounded-lg border border-line bg-elev pl-9 pr-3 text-sm"/>
        </label>
      </div>
      {grouped.length === 0 ? (<Panel>
          <p className="py-8 text-center text-sm text-ink2">No services found. Create a new service to get started.</p>
        </Panel>) : (<div className="space-y-6">
          {grouped.map((g) => (<section key={g.category}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink2">
                {g.category} <span className="rounded-full bg-elev px-1.5 font-mono">{g.items.length}</span>
              </h2>
              <Panel bodyClassName="divide-y divide-line p-0">
                {g.items.map((s) => (<div key={s.id} className={cn("flex flex-col gap-3 p-4 md:flex-row md:items-center", !s.active && "opacity-60")}>
                    {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : null}
                    <div className="min-w-0 md:w-[30%]">
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
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="w-24 text-right font-display text-lg">{formatNgn(s.basePriceKobo)}</p>
                      {!s.active ? <AdminStatusPill status="Inactive"/> : null}
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={s.active} onChange={(e) => toggle(s, e.target.checked)}/>
                        Live
                      </label>
                      <Link href={`/services/${encodeURIComponent(s.slug)}`} className={adminBtnOutline} aria-label={`View ${s.name} on site`}>
                        View spa service
                      </Link>
                      <button type="button" className={adminBtnOutline} aria-label={`Edit ${s.name}`} onClick={() => startEdit(s)}>
                        <Pencil className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  </div>))}
              </Panel>
            </section>))}
        </div>)}
      {open ? <ServiceEditorModal value={editing ?? undefined} categories={categories} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} /> : null}
    </div>);
}
