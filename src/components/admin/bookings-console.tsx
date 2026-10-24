"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, RotateCcw, UserX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtnGhost } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { SearchInput } from "@/components/admin/search-input";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";

export type AdminBookingRow = {
  id: string;
  ref: string;
  customer: string;
  vendor: string;
  service: string;
  when: string;
  location: string;
  total: number;
  base: number;
  surcharge: number;
  commission: number;
  vendorPayable: number;
  payment: string;
  status: string;
  bucket: string;
};

type Filter = "all" | "Upcoming" | "In progress" | "Completed" | "Cancelled";

export function BookingsConsole({ rows, editable, canSeeMoney }: { rows: AdminBookingRow[]; editable: boolean; canSeeMoney: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((b) => (filter === "all" || b.bucket === filter) && (!q || [b.ref, b.customer, b.vendor].some((x) => x.toLowerCase().includes(q))));
  }, [rows, query, filter]);
  const b = rows.find((x) => x.id === selectedId) ?? filtered[0];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={query} onChange={setQuery} label="Search bookings" placeholder="Reference, customer or vendor" className="lg:w-72" />
          <FilterChips
            label="Filter by status"
            value={filter}
            onChange={setFilter}
            options={(["all", "Upcoming", "In progress", "Completed", "Cancelled"] as Filter[]).map((v) => ({
              value: v,
              label: v === "all" ? "All" : v
            }))}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={CalendarX} title="No bookings found" text="No bookings match this search or status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-2 py-2 font-medium">Customer → Vendor</th>
                  <th className="px-2 py-2 font-medium">When</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Payment</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id} onClick={() => setSelectedId(x.id)} className={cn("cursor-pointer border-b border-line last:border-0", x.id === b?.id && "bg-gold/5")}>
                    <td className="px-4 py-2 font-mono text-xs">{x.ref}</td>
                    <td className="px-2 py-2 text-xs">
                      {x.customer}
                      <span className="block text-[11px] text-ink2">{x.vendor}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs">{x.when}</td>
                    <td className="px-2 py-2 text-xs">{x.location}</td>
                    <td className="px-2 py-2 text-right text-xs tabular-nums">{formatNgn(x.total)}</td>
                    <td className="px-2 py-2">
                      <AdminStatusPill status={x.payment} />
                    </td>
                    <td className="px-4 py-2">
                      <AdminStatusPill status={x.bucket} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {b ? (
        <Panel title={b.ref} description={b.service} actions={<AdminStatusPill status={b.bucket} />}>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-ink2">Customer</dt>
              <dd className="font-medium">{b.customer}</dd>
            </div>
            <div>
              <dt className="text-ink2">Vendor</dt>
              <dd className="font-medium">{b.vendor}</dd>
            </div>
            <div>
              <dt className="text-ink2">Appointment</dt>
              <dd>{b.when}</dd>
            </div>
            <div>
              <dt className="text-ink2">Location type</dt>
              <dd>{b.location}</dd>
            </div>
          </dl>
          {canSeeMoney ? (
            <div className="mt-4 rounded-lg border border-line">
              <p className="border-b border-line px-3 py-2 text-xs font-medium">Price breakdown</p>
              <dl className="space-y-1.5 p-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-ink2">Service price</dt>
                  <dd className="tabular-nums">{formatNgn(b.base)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink2">Location extra</dt>
                  <dd className="tabular-nums">{formatNgn(b.surcharge)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5 font-medium">
                  <dt>Customer paid</dt>
                  <dd className="tabular-nums">{formatNgn(b.total)}</dd>
                </div>
                <div className="flex justify-between text-goldink">
                  <dt>Platform commission</dt>
                  <dd className="tabular-nums">{formatNgn(b.commission)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink2">Vendor receives</dt>
                  <dd className="tabular-nums">{formatNgn(b.vendorPayable)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <ConfirmAction
              triggerLabel="Cancel"
              triggerIcon={RotateCcw}
              disabled={!editable || ["Completed", "Cancelled"].includes(b.bucket)}
              title={`Cancel ${b.ref}?`}
              description="The booking is marked cancelled. Refunds are handled in Finance if a successful payment exists."
              confirmLabel="Cancel booking"
              requireReason
              onConfirm={async (reason) => {
                await adminJson(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled", reason }) });
                router.refresh();
              }}
            />
            <button
              type="button"
              className={adminBtnGhost}
              disabled={!editable || b.bucket === "Cancelled"}
              onClick={async () => {
                await adminJson(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status: "no_show" }) });
                router.refresh();
              }}
            >
              <UserX className="h-3.5 w-3.5" aria-hidden /> Mark no-show
            </button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <EmptyState icon={CalendarX} title="Select a booking" text="Pick a booking to see details and actions." />
        </Panel>
      )}
    </div>
  );
}
