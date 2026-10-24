"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Search } from "lucide-react";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { FilterChips } from "@/components/admin/filter-chips";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/cn";

type Filter = "all" | "action" | "upcoming" | "past" | "cancelled";

const ACTION = ["pending", "awaiting_payment", "cancellation_requested"];
const UPCOMING = ["confirmed", "in_progress"];
const PAST = ["completed", "no_show"];
const CANCELLED = ["cancelled", "refunded", "refund_pending"];

export function VendorBookingsConsole({
  rows,
  initialQuery
}: {
  rows: {
    id: string;
    ref: string;
    customer: string;
    service: string;
    when: string;
    time: string;
    location: string;
    staff: string;
    payable: number;
    totalLabel: string;
    status: string;
    payment: string;
  }[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<Filter>("all");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((b) => {
      const ok =
        view === "all"
          ? true
          : view === "action"
            ? ACTION.includes(b.status)
            : view === "upcoming"
              ? UPCOMING.includes(b.status)
              : view === "past"
                ? PAST.includes(b.status)
                : CANCELLED.includes(b.status);
      return ok && (!q || [b.customer, b.service, b.ref, b.staff].some((x) => x.toLowerCase().includes(q)));
    });
  }, [rows, view, query]);
  const selected = rows.find((b) => b.id === selectedId) ?? filtered[0];

  async function setStatus(id: string, status: string) {
    await adminJson(`/api/vendor/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    router.refresh();
  }

  return (
    <div>
      <VendorPageHeader title="Bookings" description="Every request, confirmation and refund in one inbox." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Booking views"
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "All", count: rows.length },
            { value: "action", label: "Needs action", count: rows.filter((b) => ACTION.includes(b.status)).length },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "cancelled", label: "Cancellations" }
          ]}
        />
        <label className="relative w-full lg:w-72">
          <span className="sr-only">Search bookings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, service, ref…" className="h-9 w-full rounded-lg border border-line bg-elev pl-9 pr-3 text-sm" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel bodyClassName="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={CalendarX} title="No bookings match" text="Try a different status or clear your search." />
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn("flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-elev/60", b.id === selected?.id && "bg-gold/5")}
                  >
                    <span>
                      <span className="block text-sm font-medium">{b.customer}</span>
                      <span className="block text-xs text-ink2">
                        {b.service} · {b.when}
                      </span>
                    </span>
                    <span className="text-right">
                      <AdminStatusPill status={b.status} />
                      <span className="mt-1 block text-xs font-semibold">{b.totalLabel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {selected ? (
          <Panel title={selected.customer} description={selected.service} actions={<AdminStatusPill status={selected.status} />}>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-ink2">When</dt>
                <dd>{selected.when}</dd>
              </div>
              <div>
                <dt className="text-ink2">Location</dt>
                <dd className="capitalize">{selected.location}</dd>
              </div>
              <div>
                <dt className="text-ink2">Therapist</dt>
                <dd>{selected.staff}</dd>
              </div>
              <div>
                <dt className="text-ink2">Your payable</dt>
                <dd className="tabular-nums">{selected.totalLabel}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <button type="button" className={adminBtn} onClick={() => setStatus(selected.id, "confirmed")}>
                Confirm
              </button>
              <button type="button" className={adminBtnOutline} onClick={() => setStatus(selected.id, "completed")}>
                Complete
              </button>
              <button type="button" className={adminBtnOutline} onClick={() => setStatus(selected.id, "no_show")}>
                No-show
              </button>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
