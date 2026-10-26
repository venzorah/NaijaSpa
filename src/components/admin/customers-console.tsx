"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Mail, Phone, RotateCcw, Trash2, UserRound, UserX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterChips } from "@/components/admin/filter-chips";
import { KeyValue } from "@/components/admin/key-value";
import { Panel } from "@/components/admin/panel";
import { PersonAvatar } from "@/components/admin/avatar";
import { SearchInput } from "@/components/admin/search-input";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  city: string;
  joined: string;
  lastActive: string;
  bookings: number;
  spend: number;
  deletionRequested: string | null;
  tickets: { id: string; subject: string; status: string; createdAt: string }[];
};

type Filter = "all" | "active" | "suspended" | "deletion";

export function CustomersConsole({ rows, editable }: { rows: AdminCustomer[]; editable: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((c) => {
      const matches = !q || [c.name, c.email, c.phone ?? "", c.city].some((v) => v.toLowerCase().includes(q));
      if (!matches) return false;
      if (filter === "active") return c.status === "active";
      if (filter === "suspended") return c.status === "suspended";
      if (filter === "deletion") return Boolean(c.deletionRequested);
      return true;
    });
  }, [rows, query, filter]);

  const selected = rows.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  async function patch(id: string, body: Record<string, unknown>) {
    await adminJson(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Panel className="xl:col-span-3" bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={query} onChange={setQuery} label="Search customers" placeholder="Name, email, phone or city" className="lg:w-72" />
          <FilterChips
            label="Filter customers"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: rows.length },
              { value: "active", label: "Active", count: rows.filter((c) => c.status === "active").length },
              { value: "suspended", label: "Suspended", count: rows.filter((c) => c.status === "suspended").length },
              { value: "deletion", label: "Deletion requests", count: rows.filter((c) => c.deletionRequested).length }
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={UserRound} title="No customers match" text="Try a different name, phone number or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">City</th>
                  <th className="px-2 py-2 text-right font-medium">Bookings</th>
                  <th className="px-2 py-2 text-right font-medium">Lifetime spend</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn("cursor-pointer border-b border-line last:border-0", c.id === selected?.id && "bg-gold/5")}
                  >
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2.5">
                        <PersonAvatar name={c.name} />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium">{c.name}</span>
                          <span className="block truncate text-[11px] text-ink2">{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs">{c.city || "—"}</td>
                    <td className="px-2 py-2 text-right text-xs tabular-nums">{c.bookings}</td>
                    <td className="px-2 py-2 text-right text-xs tabular-nums">{formatNgn(c.spend)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <AdminStatusPill status={c.status} />
                        {c.deletionRequested ? <AdminStatusPill status="Deletion" /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="space-y-4 xl:col-span-2">
        {selected ? (
          <>
            <Panel>
              <div className="flex items-start gap-3">
                <PersonAvatar name={selected.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <AdminStatusPill status={selected.status} />
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink2">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden />
                      {selected.email}
                    </span>
                    {selected.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden />
                        {selected.phone}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <KeyValue
                  items={[
                    { label: "Customer ID", value: <span className="font-mono text-xs">{selected.id}</span> },
                    { label: "City", value: selected.city || "—" },
                    { label: "Joined", value: selected.joined },
                    { label: "Last active", value: selected.lastActive },
                    { label: "Bookings", value: selected.bookings },
                    { label: "Lifetime spend", value: formatNgn(selected.spend) }
                  ]}
                />
              </div>
              {selected.deletionRequested ? (
                <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs">
                  <p className="font-medium text-goldink">Account deletion requested · {selected.deletionRequested}</p>
                  <p className="mt-1 text-ink2">Under NDPA 2023, complete within 30 days. Financial records stay anonymised.</p>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {selected.status === "suspended" ? (
                  <ConfirmAction
                    triggerLabel="Reinstate"
                    triggerIcon={RotateCcw}
                    disabled={!editable}
                    title={`Reinstate ${selected.name}?`}
                    description="The customer will regain access and can make bookings immediately."
                    confirmLabel="Reinstate account"
                    requireReason
                    onConfirm={(reason) => patch(selected.id, { status: "active", note: reason })}
                  />
                ) : (
                  <ConfirmAction
                    triggerLabel="Suspend"
                    triggerIcon={Ban}
                    disabled={!editable}
                    title={`Suspend ${selected.name}?`}
                    description="They will be signed out and blocked from booking."
                    confirmLabel="Suspend account"
                    impact={["Active sessions revoked on next request", "Recorded in audit log"]}
                    requireReason
                    onConfirm={(reason) => patch(selected.id, { status: "suspended", note: reason })}
                  />
                )}
                {selected.deletionRequested ? (
                  <ConfirmAction
                    triggerLabel="Process deletion"
                    triggerIcon={Trash2}
                    disabled={!editable}
                    title="Permanently delete personal data?"
                    description="Profile fields are redacted. Booking and payment records stay anonymised."
                    confirmLabel="Delete personal data"
                    requireReason
                    onConfirm={(reason) => patch(selected.id, { processDeletion: true, note: reason })}
                  />
                ) : null}
              </div>
            </Panel>
            <Panel title="Support history" description={`${selected.tickets.length} conversation${selected.tickets.length === 1 ? "" : "s"}`}>
              {selected.tickets.length === 0 ? (
                <EmptyState icon={UserX} title="No support history" text="This customer has never contacted support." />
              ) : (
                <ul className="divide-y divide-line">
                  {selected.tickets.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{h.subject}</p>
                        <p className="text-[11px] text-ink2">{h.createdAt}</p>
                      </div>
                      <AdminStatusPill status={h.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        ) : (
          <Panel>
            <EmptyState icon={UserX} title="Select a customer" text="Choose a customer from the list to see their profile." />
          </Panel>
        )}
      </div>
    </div>
  );
}
