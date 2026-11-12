"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Store } from "lucide-react";
import { EditorModal } from "./editor-modal";
import { VendorWorkspace } from "./vendor-workspace";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { SearchInput } from "@/components/admin/search-input";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { vendorStatusLabel } from "@/lib/admin";
import { cn } from "@/lib/cn";

export type AdminVendorRow = {
  id: string;
  businessName: string;
  slug: string;
  description: string;
  providerType: string;
  state: string;
  address: string;
  instagramUrl: string;
  cancellationPolicy: string;
  city: string;
  neighbourhood: string;
  applicationStatus: string;
  verificationStatus: string;
  visibility: string;
  ratingAvg: number;
  reviewCount: number;
  ownerName: string;
  ownerEmail: string;
  mobile: string;
  whatsapp: string;
  plan: string;
  planCode: string;
  services: number;
};

export function VendorsConsole({
  rows,
  editable,
  canInvite,
  listingPlans
}: {
  rows: AdminVendorRow[];
  editable: boolean;
  canInvite: boolean;
  listingPlans: Array<{ code: string; name: string; priceKobo: number; durationDays: number; active: boolean }>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Approved" | "Pending" | "Suspended">("all");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((v) => {
      const label = vendorStatusLabel(v.applicationStatus);
      const ok = filter === "all" || label === filter;
      return ok && (!q || [v.businessName, v.ownerName, v.city, v.neighbourhood].some((x) => x.toLowerCase().includes(q)));
    });
  }, [rows, query, filter]);
  const selected = rows.find((v) => v.id === selectedId);
  function close() { setSelectedId(""); setCreating(false); setMsg(""); }

  async function patchStatus(id: string, applicationStatus: string, extra: Record<string, string> = {}) {
    await adminJson(`/api/admin/vendors/${id}`, { method: "PATCH", body: JSON.stringify({ applicationStatus, ...extra }) });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" className={adminBtn} disabled={!canInvite} onClick={() => { setCreating(true); setSelectedId(""); setMsg(""); }}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Create vendor
        </button>
      </div>
      {msg && !selected && !creating ? <p className="mb-4 break-all text-sm text-goldink" role="status">{msg}</p> : null}
      <div className="space-y-4">
        <Panel bodyClassName="p-0">
          <div className="space-y-2 border-b border-line p-3">
            <SearchInput value={query} onChange={setQuery} label="Search vendors" placeholder="Business, owner or area" />
            <FilterChips
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: rows.length },
                { value: "Approved", label: "Approved", count: rows.filter((v) => v.applicationStatus === "approved").length },
                { value: "Pending", label: "Pending", count: rows.filter((v) => ["draft", "submitted", "under_review"].includes(v.applicationStatus)).length },
                { value: "Suspended", label: "Suspended", count: rows.filter((v) => v.applicationStatus === "suspended").length }
              ]}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Store} title="No vendors found" text="Adjust your search or status filter." />
          ) : (
            <ul className="max-h-[calc(100vh-260px)] divide-y divide-line overflow-y-auto">
              {filtered.map((v) => {
                const active = v.id === selected?.id && !creating;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      aria-label={`View vendor ${v.businessName}`}
                      onClick={() => {
                        setSelectedId(v.id);
                        setMsg("");
                        setCreating(false);
                      }}
                      className={cn("flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-elev/60", active && "bg-gold/5 shadow-[inset_2px_0_0_#d4af37]")}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-forest text-[11px] font-semibold text-gold">
                        {v.businessName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">{v.businessName}</span>
                          <AdminStatusPill status={vendorStatusLabel(v.applicationStatus)} />
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink2">
                          <span className="truncate">
                            {v.neighbourhood ? `${v.neighbourhood}, ` : ""}
                            {v.city}
                          </span>
                          <span>· {v.plan}</span>
                          {v.ratingAvg > 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-gold text-gold" aria-hidden />
                              {v.ratingAvg.toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        {(creating || selected) ? <EditorModal size={creating ? "md" : "lg"} title={creating ? "Create vendor" : selected?.businessName ?? "Vendor"} busy={busy} onClose={close}><div className="min-w-0">
          {creating ? (
            <Panel title="Create vendor" description="Sends a setup invite. No password is shown to admins.">
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  const fd = new FormData(e.currentTarget);
                  setBusy(true);
                  try {
                  const json = await adminJson<{ setupUrl?: string; error?: string }>("/api/admin/vendors", {
                    method: "POST",
                    body: JSON.stringify({
                      email: fd.get("email"),
                      businessName: fd.get("businessName"),
                      city: fd.get("city")
                    })
                  });
                  setMsg(json.setupUrl ? `Invite created. Setup path: ${json.setupUrl}` : "");
                  setCreating(false);
                  router.refresh();
                  } catch { /* adminJson displays the error toast. */ }
                  finally { setBusy(false); }
                }}
              >
                <FormRow label="Vendor email" htmlFor="v-email">
                  <input id="v-email" name="email" type="email" required className={adminField} />
                </FormRow>
                <FormRow label="Business name" htmlFor="v-name">
                  <input id="v-name" name="businessName" required className={adminField} />
                </FormRow>
                <FormRow label="City" htmlFor="v-city">
                  <input id="v-city" name="city" required className={adminField} />
                </FormRow>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} className={adminBtnOutline} onClick={() => setCreating(false)}>
                    Cancel
                  </button>
                  <button disabled={busy} className={adminBtn}>{busy ? "Creating…" : "Create & invite"}</button>
                </div>
              </form>
            </Panel>
          ) : selected ? (
            <VendorWorkspace
              vendor={selected}
              editable={editable}
              listingPlans={listingPlans}
              msg={msg}
              setMsg={setMsg}
              busy={busy}
              setBusy={setBusy}
              onStatus={patchStatus}
            />
          ) : null}
        </div></EditorModal> : null}
      </div>
    </div>
  );
}
