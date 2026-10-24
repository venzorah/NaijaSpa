"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, MapPin, PencilLine, ShieldCheck, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtn } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";

export type AdminServiceRow = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  vendor: string;
  category: string;
  price: number;
  duration: number;
  active: boolean;
  locations: string[];
  createdAt: string;
};

function detectIssues(s: AdminServiceRow): string[] {
  const issues: string[] = [];
  if (/\b0\d{3}\s?\d{3}\s?\d{4}\b|\+234/.test(s.description)) issues.push("Contains a phone number (off-platform contact)");
  if (/guarantee|lose \d+kg|cure/i.test(s.name + s.description)) issues.push("Unverifiable health or medical claim");
  if (s.price < 500000) issues.push("Price unusually low for category");
  return issues;
}

export function ServicesConsole({ rows, editable }: { rows: AdminServiceRow[]; editable: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "live" | "hidden">("pending");
  const filtered = rows.filter((s) => (filter === "live" ? s.active : filter === "hidden" ? !s.active : !s.active));
  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? rows[0]?.id ?? "");
  const selected = rows.find((s) => s.id === selectedId) ?? filtered[0];
  const issues = selected ? detectIssues(selected) : [];

  return (
    <div>
      <div className="mb-4">
        <FilterChips
          label="Moderation queue"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "Hidden / pending", count: rows.filter((s) => !s.active).length },
            { value: "live", label: "Live", count: rows.filter((s) => s.active).length }
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2" bodyClassName="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Nothing in this queue" text="Nothing needs your attention here." />
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={cn("flex w-full gap-3 p-3 text-left hover:bg-elev/60", selected?.id === s.id && "bg-gold/5 shadow-[inset_2px_0_0_#d4af37]")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{s.name}</span>
                      <span className="block truncate text-[11px] text-ink2">
                        {s.vendor} · {s.category}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="tabular-nums">{formatNgn(s.price)}</span>
                        {detectIssues(s).length > 0 ? <AdminStatusPill status={`${detectIssues(s).length} issues`} /> : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="xl:col-span-3">
          {selected ? (
            <Panel>
              {selected.imageUrl ? <img src={selected.imageUrl} alt="" className="-mx-4 -mt-4 mb-4 h-48 w-[calc(100%+2rem)] rounded-t-xl object-cover" /> : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{selected.name}</h2>
                  <p className="text-xs text-ink2">
                    {selected.vendor} · submitted {selected.createdAt}
                  </p>
                </div>
                <AdminStatusPill status={selected.active ? "Live" : "Hidden"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <span className="font-semibold tabular-nums">{formatNgn(selected.price)}</span>
                <span className="inline-flex items-center gap-1 text-ink2">
                  <Clock className="h-3 w-3" aria-hidden />
                  {selected.duration} min
                </span>
                <span className="inline-flex items-center gap-1 text-ink2">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {selected.locations.join(" · ") || "—"}
                </span>
                <span className="text-ink2">{selected.category}</span>
              </div>
              <p className="mt-4 rounded-lg border border-line bg-elev/50 p-3 text-sm leading-relaxed">{selected.description || "No description."}</p>
              {issues.length > 0 ? (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Automated checks
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-ink2">
                    {issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-forest">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Passed automated policy checks
                </p>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                <ConfirmAction
                  triggerLabel="Hide / reject"
                  triggerIcon={XCircle}
                  triggerVariant="ghost"
                  disabled={!editable || !selected.active}
                  title="Hide this service?"
                  description="The vendor listing is taken off the marketplace until it is approved again."
                  confirmLabel="Hide service"
                  requireReason
                  onConfirm={async (r) => {
                    await adminJson(`/api/admin/services/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: false, note: r }) });
                    router.refresh();
                  }}
                />
                <ConfirmAction
                  triggerLabel="Request changes"
                  triggerIcon={PencilLine}
                  disabled={!editable}
                  title="Request changes?"
                  description="The listing is hidden until the vendor fixes it."
                  confirmLabel="Send request"
                  requireReason
                  onConfirm={async (r) => {
                    await adminJson(`/api/admin/services/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: false, note: r }) });
                    router.refresh();
                  }}
                />
                <button
                  type="button"
                  className={adminBtn}
                  disabled={!editable || selected.active}
                  onClick={async () => {
                    await adminJson(`/api/admin/services/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
                    router.refresh();
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
                </button>
              </div>
            </Panel>
          ) : (
            <Panel>
              <EmptyState icon={ShieldCheck} title="Nothing to review" text="Select a listing from the queue." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
