"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarX, ChevronRight, Clock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { formatNgn } from "@/lib/money";

export type BookingRowData = {
  id: string;
  status: string;
  startsAt: string;
  locationType: string;
  customerTotalKobo: number;
  serviceName: string;
  serviceImage: string | null;
  vendorName: string;
};

const TABS = [
  { id: "upcoming", label: "upcoming" },
  { id: "pending", label: "pending" },
  { id: "completed", label: "completed" },
  { id: "cancelled", label: "cancelled" },
  { id: "refunded", label: "refunded" }
] as const;

function matches(tab: (typeof TABS)[number]["id"], b: BookingRowData, now: number) {
  const t = new Date(b.startsAt).getTime();
  if (tab === "upcoming") return ["confirmed", "in_progress"].includes(b.status) && t >= now;
  if (tab === "pending") return ["pending", "awaiting_payment"].includes(b.status);
  if (tab === "completed") return b.status === "completed" || (["confirmed"].includes(b.status) && t < now);
  if (tab === "cancelled") return b.status === "cancelled" || b.status === "cancellation_requested";
  return b.status === "refunded" || b.status === "refund_pending";
}

export function BookingsTabs({ bookings }: { bookings: BookingRowData[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("upcoming");
  const now = Date.now();
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, bookings.filter((b) => matches(t.id, b, now)).length])),
    [bookings, now]
  );
  const list = bookings.filter((b) => matches(tab, b, now));

  return (
    <>
      <div role="tablist" aria-label="Booking status" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold capitalize ${
              tab === t.id ? "border-gold bg-gold text-ongold" : "border-line bg-card text-ink2"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[11px] ${tab === t.id ? "bg-ongold/15" : "bg-elev"}`}>{counts[t.id]}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3" role="tabpanel">
        {list.length ? (
          list.map((b) => (
            <Link
              key={b.id}
              href={`/account/bookings/${b.id}`}
              className="flex w-full gap-3 rounded-3xl border border-line bg-card p-3 text-left transition hover:border-gold/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.serviceImage || "/photos/massage.jpg"} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ink">{b.serviceName}</span>
                  <StatusPill status={b.status} />
                </span>
                <span className="block truncate text-xs text-ink2">
                  {b.vendorName} · {b.locationType}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink2">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-leaf" aria-hidden />
                    {new Date(b.startsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-leaf" aria-hidden />
                    {new Date(b.startsAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-semibold text-ink">{formatNgn(b.customerTotalKobo)}</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 self-center text-ink2" aria-hidden />
            </Link>
          ))
        ) : (
          <EmptyState
            icon={CalendarX}
            title={`No ${tab} bookings`}
            text="When you book a treatment it will show up here."
            actionHref="/explore"
            actionLabel="Find a treatment"
          />
        )}
      </div>
    </>
  );
}
