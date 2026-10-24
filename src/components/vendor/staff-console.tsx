"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type Staff = {
  id: string;
  name: string;
  gender: string;
  title: string;
  bio: string;
  active: boolean;
  bookings: number;
  slots: { weekday: number; startMin: number; endMin: number; bufferMin: number }[];
};

export function VendorStaffConsole({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? "");
  const selected = staff.find((s) => s.id === selectedId) ?? staff[0];
  const [name, setName] = useState("");
  const [title, setTitle] = useState("Therapist");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);
  const week = useMemo(() => {
    return DAYS.map((_, weekday) => {
      const slot = selected?.slots.find((s) => s.weekday === weekday);
      return {
        weekday,
        off: !slot,
        start: slot ? minToTime(slot.startMin) : "09:00",
        end: slot ? minToTime(slot.endMin) : "18:00",
        bufferMin: slot?.bufferMin ?? 15
      };
    });
  }, [selected]);
  const [draft, setDraft] = useState(week);
  const [buffer, setBuffer] = useState(15);

  function select(id: string) {
    const next = staff.find((s) => s.id === id);
    setSelectedId(id);
    const w = DAYS.map((_, weekday) => {
      const slot = next?.slots.find((s) => s.weekday === weekday);
      return {
        weekday,
        off: !slot,
        start: slot ? minToTime(slot.startMin) : "09:00",
        end: slot ? minToTime(slot.endMin) : "18:00",
        bufferMin: slot?.bufferMin ?? 15
      };
    });
    setDraft(w);
    setBuffer(w.find((d) => !d.off)?.bufferMin ?? 15);
  }

  async function add() {
    setBusy(true);
    try {
      await adminJson("/api/vendor/staff", { method: "POST", body: JSON.stringify({ name, title, gender }) });
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveMeta() {
    if (!selected) return;
    await adminJson("/api/vendor/staff", {
      method: "PATCH",
      body: JSON.stringify({ id: selected.id, name: selected.name, title: selected.title, gender: selected.gender, bio: selected.bio, active: selected.active })
    });
    router.refresh();
  }

  async function saveSchedule() {
    if (!selected) return;
    setBusy(true);
    try {
      await adminJson("/api/vendor/availability", {
        method: "PUT",
        body: JSON.stringify({
          staffId: selected.id,
          slots: draft
            .filter((d) => !d.off)
            .map((d) => ({ weekday: d.weekday, startMin: timeToMin(d.start), endMin: timeToMin(d.end), bufferMin: buffer }))
        })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await adminJson("/api/vendor/staff", { method: "PATCH", body: JSON.stringify({ id, active }) });
    router.refresh();
  }

  return (
    <div>
      <VendorPageHeader
        title="Staff & schedules"
        description="Therapist shifts and buffers drive what guests can book."
      />
      <Panel className="mb-4" title="Add therapist">
        <div className="grid gap-3 sm:grid-cols-4">
          <FormRow label="Name" htmlFor="st-name">
            <input id="st-name" className={adminField} value={name} onChange={(e) => setName(e.target.value)} />
          </FormRow>
          <FormRow label="Title" htmlFor="st-title">
            <input id="st-title" className={adminField} value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormRow>
          <FormRow label="Gender" htmlFor="st-gender">
            <input id="st-gender" className={adminField} value={gender} onChange={(e) => setGender(e.target.value)} />
          </FormRow>
          <div className="flex items-end">
            <button type="button" className={adminBtn} disabled={busy || name.length < 2} onClick={add}>
              <UserPlus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
      </Panel>
      {staff.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-sm text-ink2">Add your first therapist to publish a bookable roster.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Panel bodyClassName="p-0" title={`Team · ${staff.length}`}>
            <ul>
              {staff.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => select(s.id)}
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", s.id === selected?.id ? "bg-elev" : "hover:bg-elev/60")}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest/10 text-xs font-semibold text-forest">
                      {s.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-ink2">{s.title || "Therapist"}</span>
                    </span>
                    <AdminStatusPill status={s.active ? "Active" : "Hidden"} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          {selected ? (
            <Panel title={selected.name} description={`${selected.bookings} bookings · ${selected.title || "Therapist"}`}>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="text-sm">Visible on booking</span>
                <input type="checkbox" checked={selected.active} onChange={(e) => toggleActive(selected.id, e.target.checked)} />
              </div>
              <FormRow label="Buffer between bookings" htmlFor="st-buffer">
                <select id="st-buffer" className={adminField} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))}>
                  {[0, 10, 15, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? "No buffer" : `${m} minutes`}
                    </option>
                  ))}
                </select>
              </FormRow>
              <p className="mb-2 mt-5 text-sm font-medium">Weekly schedule</p>
              <div className="space-y-2">
                {draft.map((d, i) => (
                  <div key={d.weekday} className="flex flex-col gap-2 rounded-xl border border-line p-3 md:flex-row md:items-center">
                    <label className="flex items-center gap-2 md:w-28">
                      <input
                        type="checkbox"
                        checked={!d.off}
                        onChange={(e) => setDraft((prev) => prev.map((x, j) => (j === i ? { ...x, off: !e.target.checked } : x)))}
                      />
                      <span className="text-sm font-medium">{DAYS[d.weekday]}</span>
                    </label>
                    {d.off ? (
                      <span className="text-sm text-ink2">Day off</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          className="h-8 rounded-lg border border-line bg-elev px-2 text-sm"
                          value={d.start}
                          onChange={(e) => setDraft((prev) => prev.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        />
                        <span className="text-ink2">–</span>
                        <input
                          type="time"
                          className="h-8 rounded-lg border border-line bg-elev px-2 text-sm"
                          value={d.end}
                          onChange={(e) => setDraft((prev) => prev.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className={adminBtnOutline} onClick={saveMeta}>
                  Save profile
                </button>
                <button type="button" className={adminBtn} disabled={busy} onClick={saveSchedule}>
                  {busy ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  );
}
