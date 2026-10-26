"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";

type Promo = {
  id: string;
  code: string;
  description: string;
  percentOff: number;
  amountKobo: number;
  active: boolean;
  usedCount: number;
  maxRedemptions: number | null;
  startsAt: string;
  endsAt: string;
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/memberships");
    if (res.ok) {
      const json = await res.json();
      setPromos(json.promos || []);
      setCanEdit(Boolean(json.canEdit));
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <AdminPageHeader screen="memberships" />
      <p className="mb-3 text-sm text-ink2">
        Booking promo codes only. Therapist listing plans (Free, Silver, Gold, Platinum) are on Commercial config and the vendor dashboard.
      </p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      {!canEdit ? <p className="mb-3 text-sm text-ink2">View only. Promo codes are edited by the live admin.</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Promo codes" description="Discounts funded by the platform reduce recognized revenue.">
          {promos.length === 0 ? <p className="text-sm text-ink2">No promo codes yet.</p> : null}
          <ul className="divide-y divide-line">
            {promos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-mono text-xs font-semibold">{p.code}</p>
                  <p className="text-[11px] text-ink2">
                    {p.description} · {p.percentOff ? `${p.percentOff}%` : formatNgn(p.amountKobo)} · used {p.usedCount}
                    {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusPill status={p.active ? "Active" : "Paused"} />
                  <button
                    type="button"
                    className={adminBtnOutline}
                    disabled={!canEdit}
                    onClick={async () => {
                      if (!canEdit) return;
                      await adminJson("/api/admin/promotions", { method: "PATCH", body: JSON.stringify({ id: p.id, active: !p.active }) });
                      load();
                    }}
                  >
                    {p.active ? "Pause" : "Resume"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        {canEdit ? (
          <Panel title="Create promo">
            <form
              className="grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                const fd = new FormData(e.currentTarget);
                try {
                  await adminJson("/api/admin/promotions", {
                    method: "POST",
                    body: JSON.stringify({
                      code: fd.get("code"),
                      description: fd.get("description"),
                      percentOff: Number(fd.get("percentOff") || 0),
                      startsAt: fd.get("startsAt"),
                      endsAt: fd.get("endsAt")
                    })
                  });
                  e.currentTarget.reset();
                  load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not create promo.");
                }
              }}
            >
              <FormRow label="Code" htmlFor="promo-code">
                <input id="promo-code" name="code" required placeholder="LAGOSRELAX" className={adminField} />
              </FormRow>
              <FormRow label="Description" htmlFor="promo-desc">
                <input id="promo-desc" name="description" required placeholder="15% off first booking" className={adminField} />
              </FormRow>
              <FormRow label="Discount %" htmlFor="promo-pct">
                <input id="promo-pct" name="percentOff" type="number" min={0} max={100} placeholder="10" className={adminField} />
              </FormRow>
              <FormRow label="Starts" htmlFor="promo-start">
                <input id="promo-start" name="startsAt" type="datetime-local" required className={adminField} />
              </FormRow>
              <FormRow label="Ends" htmlFor="promo-end">
                <input id="promo-end" name="endsAt" type="datetime-local" required className={adminField} />
              </FormRow>
              <button className={adminBtn}>
                <Tag className="h-3.5 w-3.5" /> Create promo
              </button>
            </form>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
