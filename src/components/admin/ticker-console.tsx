"use client";

import { useState } from "react";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { TICKER_TEXT_MAX, type TickerSlot } from "@/lib/ticker";

export function TickerConsole({ initial, canEdit }: { initial: TickerSlot[]; canEdit: boolean }) {
  const [slots, setSlots] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function patch(id: TickerSlot["id"], next: Partial<TickerSlot>) {
    setSlots((rows) => rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink2">
        These three lines scroll on the customer top bar. They are not email or in-app announcement blasts — use Admin → Announcements for that.
      </p>
      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canEdit) return;
          setBusy(true);
          setError("");
          try {
            const json = await adminJson<{ slots: TickerSlot[] }>("/api/admin/ticker", {
              method: "PUT",
              body: JSON.stringify({ slots })
            });
            setSlots(json.slots);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save ticker.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {slots.map((slot) => (
          <Panel
            key={slot.id}
            title={`Update ${slot.id}`}
            actions={<AdminStatusPill status={slot.active && slot.text ? "On" : "Off"} tone={slot.active && slot.text ? "gold" : "neutral"} dot={false} />}
          >
            <div className="grid gap-3">
              <label className="flex min-h-10 items-center justify-between gap-3 text-sm">
                <span>Show on top bar</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.active}
                  disabled={!canEdit}
                  className={`relative h-6 w-11 shrink-0 rounded-full ${slot.active ? "bg-leaf" : "bg-elev"} disabled:opacity-50`}
                  onClick={() => patch(slot.id, { active: !slot.active })}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${slot.active ? "right-0.5" : "left-0.5"}`} />
                </button>
              </label>
              <FormRow label="Message" htmlFor={`ticker-text-${slot.id}`} hint={`${slot.text.length}/${TICKER_TEXT_MAX}`}>
                <input
                  id={`ticker-text-${slot.id}`}
                  value={slot.text}
                  maxLength={TICKER_TEXT_MAX}
                  disabled={!canEdit}
                  onChange={(e) => patch(slot.id, { text: e.target.value })}
                  placeholder="Eid weekend hours · Book early"
                  className={adminField}
                />
              </FormRow>
              <FormRow label="Optional link" htmlFor={`ticker-href-${slot.id}`} hint="A site path such as /explore. Leave blank for text only.">
                <input
                  id={`ticker-href-${slot.id}`}
                  value={slot.href}
                  disabled={!canEdit}
                  onChange={(e) => patch(slot.id, { href: e.target.value })}
                  placeholder="/explore"
                  className={adminField}
                />
              </FormRow>
            </div>
          </Panel>
        ))}
        {canEdit ? (
          <button className={adminBtn} disabled={busy}>
            {busy ? "Saving…" : "Save ticker"}
          </button>
        ) : (
          <p className="text-sm text-ink2">View only.</p>
        )}
      </form>
    </div>
  );
}
