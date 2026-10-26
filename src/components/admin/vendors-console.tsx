"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star, Store } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { KeyValue } from "@/components/admin/key-value";
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
  city: string;
  neighbourhood: string;
  applicationStatus: string;
  verificationStatus: string;
  visibility: string;
  ratingAvg: number;
  reviewCount: number;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  planCode: string;
  services: number;
};

export function VendorsConsole({
  rows,
  editable,
  listingPlans
}: {
  rows: AdminVendorRow[];
  editable: boolean;
  listingPlans: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Approved" | "Pending" | "Suspended">("all");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
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

  async function patchStatus(id: string, applicationStatus: string, extra: Record<string, string> = {}) {
    await adminJson(`/api/admin/vendors/${id}`, { method: "PATCH", body: JSON.stringify({ applicationStatus, ...extra }) });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" className={adminBtn} disabled={!editable} onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Create vendor
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
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
                const active = v.id === selectedId && !creating;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(v.id);
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
        <div className="min-w-0">
          {creating ? (
            <Panel title="Create vendor" description="Sends a setup invite. No password is shown to admins.">
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
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
                  <button type="button" className={adminBtnOutline} onClick={() => setCreating(false)}>
                    Cancel
                  </button>
                  <button className={adminBtn}>Create & invite</button>
                </div>
              </form>
            </Panel>
          ) : selected ? (
            <Panel title={selected.businessName} description={`${selected.slug} · ${selected.plan}`} actions={<AdminStatusPill status={vendorStatusLabel(selected.applicationStatus)} />}>
              <KeyValue
                items={[
                  { label: "Owner", value: selected.ownerName },
                  { label: "Email", value: selected.ownerEmail },
                  { label: "City", value: `${selected.neighbourhood ? `${selected.neighbourhood}, ` : ""}${selected.city}` },
                  { label: "Verification", value: selected.verificationStatus },
                  { label: "Visibility", value: selected.visibility },
                  { label: "Services", value: selected.services },
                  { label: "Reviews", value: `${selected.reviewCount} · ${selected.ratingAvg.toFixed(1)} avg` },
                  { label: "Plan", value: selected.plan }
                ]}
              />
              <form
                className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await adminJson(`/api/admin/vendors/${selected.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ planCode: fd.get("planCode") })
                  });
                  setMsg("Listing plan updated.");
                  router.refresh();
                }}
              >
                <FormRow label="Listing plan" htmlFor="vendor-plan">
                  <select id="vendor-plan" name="planCode" defaultValue={selected.planCode} disabled={!editable} className={adminField} key={selected.id + selected.planCode}>
                    {listingPlans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <button className={adminBtn} disabled={!editable}>
                  Apply plan
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <Link href={`/providers/${encodeURIComponent(selected.slug)}`} className={adminBtnOutline} target="_blank" rel="noreferrer">
                  View spa page
                </Link>
                <ConfirmAction
                  triggerLabel="Approve"
                  triggerVariant="default"
                  disabled={!editable || selected.applicationStatus === "approved"}
                  title={`Approve ${selected.businessName}?`}
                  description="The listing can go public. The owner already has a setup path if they were invited."
                  confirmLabel="Approve vendor"
                  onConfirm={() => patchStatus(selected.id, "approved", { visibility: "public", verificationStatus: "verified" })}
                />
                <ConfirmAction
                  triggerLabel="Suspend"
                  disabled={!editable || selected.applicationStatus === "suspended"}
                  title={`Suspend ${selected.businessName}?`}
                  description="The listing is hidden from search. Existing bookings stay unless cancelled separately."
                  confirmLabel="Suspend vendor"
                  requireReason
                  onConfirm={() => patchStatus(selected.id, "suspended", { visibility: "hidden" })}
                />
              </div>
              {msg ? <p className="mt-3 text-xs text-goldink">{msg}</p> : null}
            </Panel>
          ) : (
            <Panel>
              <EmptyState icon={Store} title="Select a vendor" text="Choose a vendor to manage their profile and plan." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
