"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarOff, Home, Hotel, Plus, Trash2 } from "lucide-react";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function VendorAvailabilityConsole({
  slots,
  locations,
  staff,
  blocks
}: {
  slots: { weekday: number; startMin: number; endMin: number; bufferMin: number }[];
  locations: { spa: boolean; hotel: boolean; home: boolean };
  staff: { id: string; name: string }[];
  blocks: { id: string; staffName: string; startsAt: string; endsAt: string; reason: string }[];
}) {
  const router = useRouter();
  const [locs, setLocs] = useState(locations);
  const [week, setWeek] = useState(
    DAYS.map((_, weekday) => {
      const slot = slots.find((s) => s.weekday === weekday);
      return {
        weekday,
        off: !slot,
        start: slot ? minToTime(slot.startMin) : "09:00",
        end: slot ? minToTime(slot.endMin) : "18:00",
        bufferMin: slot?.bufferMin ?? 15
      };
    })
  );
  const [reason, setReason] = useState("");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveHours() {
    setBusy(true);
    try {
      await adminJson("/api/vendor/availability", {
        method: "PUT",
        body: JSON.stringify({
          slots: week
            .filter((d) => !d.off)
            .map((d) => ({ weekday: d.weekday, startMin: timeToMin(d.start), endMin: timeToMin(d.end), bufferMin: d.bufferMin }))
        })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function setLocation(location: "spa" | "hotel" | "home", enabled: boolean) {
    setLocs((p) => ({ ...p, [location]: enabled }));
    await adminJson("/api/vendor/services", { method: "PATCH", body: JSON.stringify({ location, locationEnabled: enabled }) });
    router.refresh();
  }

  async function addBlock() {
    if (!staffId || !from || !to || reason.length < 2) return;
    setBusy(true);
    try {
      await adminJson("/api/vendor/time-off", {
        method: "POST",
        body: JSON.stringify({ staffId, startsAt: from, endsAt: to, reason })
      });
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(id: string) {
    await fetch(`/api/vendor/time-off?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <VendorPageHeader title="Availability" description="What guests can book, after shifts, buffers and blocked time." />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel title="Business hours" description="Applies when a therapist has no personal roster.">
          <div className="space-y-2">
            {week.map((d, i) => (
              <div key={d.weekday} className="flex flex-col gap-2 rounded-xl border border-line p-3 md:flex-row md:items-center">
                <label className="flex items-center gap-2 md:w-28">
                  <input type="checkbox" checked={!d.off} onChange={(e) => setWeek((p) => p.map((x, j) => (j === i ? { ...x, off: !e.target.checked } : x)))} />
                  <span className="text-sm font-medium">{DAYS[d.weekday]}</span>
                </label>
                {d.off ? (
                  <span className="text-sm text-ink2">Closed</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="time" className="h-8 rounded-lg border border-line bg-elev px-2 text-sm" value={d.start} onChange={(e) => setWeek((p) => p.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                    <span>–</span>
                    <input type="time" className="h-8 rounded-lg border border-line bg-elev px-2 text-sm" value={d.end} onChange={(e) => setWeek((p) => p.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" className={adminBtn} disabled={busy} onClick={saveHours}>
              {busy ? "Saving…" : "Save hours"}
            </button>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Service locations" description="Pause a location type without touching each service.">
            {[
              { id: "spa" as const, icon: Building2, label: "Spa / Office" },
              { id: "hotel" as const, icon: Hotel, label: "Hotel" },
              { id: "home" as const, icon: Home, label: "Home" }
            ].map((l) => (
              <div key={l.id} className="mb-2 flex items-center gap-3 rounded-xl border border-line p-3">
                <l.icon className="h-4 w-4 text-goldink" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="text-[11px] text-ink2">{locs[l.id] ? "Accepting bookings" : "Paused"}</p>
                </div>
                <input type="checkbox" checked={locs[l.id]} aria-label={`Accept ${l.label} bookings`} onChange={(e) => setLocation(l.id, e.target.checked)} />
              </div>
            ))}
          </Panel>
          <Panel title="Blocked time" description="Closures, training and holidays.">
            {blocks.length === 0 ? <p className="text-sm text-ink2">No upcoming blocks.</p> : null}
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-start gap-3 rounded-xl bg-elev p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{b.reason}</p>
                    <p className="text-xs text-ink2">
                      {b.startsAt} – {b.endsAt}
                    </p>
                    <p className="text-[11px] text-ink2">{b.staffName}</p>
                  </div>
                  <button type="button" className={adminBtnOutline} aria-label={`Remove ${b.reason}`} onClick={() => removeBlock(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2">
              <FormRow label="Reason" htmlFor="bt-reason">
                <input id="bt-reason" className={adminField} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Public holiday" />
              </FormRow>
              <FormRow label="Therapist" htmlFor="bt-staff">
                <select id="bt-staff" className={adminField} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="From" htmlFor="bt-from">
                <input id="bt-from" type="datetime-local" className={adminField} value={from} onChange={(e) => setFrom(e.target.value)} />
              </FormRow>
              <FormRow label="To" htmlFor="bt-to">
                <input id="bt-to" type="datetime-local" className={adminField} value={to} onChange={(e) => setTo(e.target.value)} />
              </FormRow>
              <button type="button" className={adminBtn} disabled={!staff.length || busy} onClick={addBlock}>
                <CalendarOff className="h-4 w-4" /> {staff.length ? "Block time" : "Add staff first"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink2">
              <Plus className="mr-1 inline h-3 w-3" /> Blocks are stored against a therapist because time-off is roster-based.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
