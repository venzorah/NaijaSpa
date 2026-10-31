"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtn, adminField } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";

export function SupportConsole({
  tickets,
  reviews,
  editable
}: {
  tickets: { id: string; subject: string; status: string; author: string; email: string; createdAt: string; notes: string }[];
  reviews: { id: string; rating: number; body: string; status: string; author: string }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tickets" | "reviews">("tickets");
  const [filter, setFilter] = useState("open");
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? "");
  const filtered = tickets.filter((t) => (filter === "all" ? true : t.status === filter));
  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0];
  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 rounded-lg border border-line bg-elev p-1">
        <button type="button" className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === "tickets" ? "bg-card ring-1 ring-gold/30" : "text-ink2")} onClick={() => setTab("tickets")}>
          Tickets
        </button>
        <button type="button" className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === "reviews" ? "bg-card ring-1 ring-gold/30" : "text-ink2")} onClick={() => setTab("reviews")}>
          Reviews
        </button>
      </div>
      {tab === "tickets" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Panel className="xl:col-span-2" bodyClassName="p-0">
            <div className="border-b border-line p-3">
              <FilterChips
                label="Tickets"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "open", label: "Open", count: tickets.filter((t) => t.status === "open").length },
                  { value: "pending", label: "Pending" },
                  { value: "resolved", label: "Resolved" },
                  { value: "all", label: "All" }
                ]}
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={Inbox} title="Inbox clear" text="No tickets in this view." />
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSelectedId(t.id)} className={cn("w-full px-3 py-3 text-left hover:bg-elev/60", t.id === selected?.id && "bg-gold/5")}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{t.subject}</span>
                        <AdminStatusPill status={t.status} />
                      </span>
                      <span className="mt-1 block text-[11px] text-ink2">
                        {t.author} · {t.createdAt}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {selected ? (
            <Panel title={selected.subject} description={`${selected.author} · ${selected.email}`} className="xl:col-span-3">
              <p className="text-xs text-ink2">Internal notes</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-elev p-3 text-sm">{selected.notes || "—"}</p>
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await adminJson(`/api/admin/tickets/${selected.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: fd.get("status"),
                      reply: fd.get("reply"),
                      internalNotes: fd.get("notes")
                    })
                  });
                  router.refresh();
                }}
              >
                <label className="text-xs font-medium">
                  Status
                  <select name="status" defaultValue={selected.status} disabled={!editable} className={`${adminField} mt-1`}>
                    <option value="open">open</option>
                    <option value="pending">pending</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Reply to customer
                  <textarea name="reply" rows={3} disabled={!editable} className={`${adminField} mt-1`} />
                </label>
                <label className="text-xs font-medium">
                  Internal notes
                  <textarea name="notes" rows={2} defaultValue={selected.notes} disabled={!editable} className={`${adminField} mt-1`} />
                </label>
                <button className={adminBtn} disabled={!editable}>
                  Update ticket
                </button>
              </form>
            </Panel>
          ) : null}
        </div>
      ) : (
        <Panel title="Review moderation">
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {r.author} · {r.rating}
                    <Star className="ml-1 inline h-3 w-3 fill-gold text-gold" aria-hidden />
                  </p>
                  <AdminStatusPill status={r.status} />
                </div>
                <p className="mt-1 text-sm text-ink2">{r.body}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className={adminBtn}
                    disabled={!editable}
                    onClick={async () => {
                      await adminJson(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
                      router.refresh();
                    }}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center rounded-full border border-line px-4 text-xs font-semibold"
                    disabled={!editable}
                    onClick={async () => {
                      await adminJson(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "hidden" }) });
                      router.refresh();
                    }}
                  >
                    Hide
                  </button>
                </div>
              </li>
            ))}
            {reviews.length === 0 ? <p className="text-sm text-ink2">No reviews yet.</p> : null}
          </ul>
        </Panel>
      )}
    </div>
  );
}
