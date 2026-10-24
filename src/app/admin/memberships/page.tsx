"use client";

import { useEffect, useState } from "react";
import { Crown, Pause, Play, Tag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

type Plan = { id: string; code: string; name: string; interval: string; priceKobo: number; benefits: string; active: boolean };
type Promo = { id: string; code: string; description: string; percentOff: number; amountKobo: number; active: boolean; usedCount: number; startsAt: string; endsAt: string };

export default function MembershipsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);

  async function load() {
    const res = await fetch("/api/admin/memberships");
    if (res.ok) {
      const json = await res.json();
      setPlans(json.plans || []);
      setPromos(json.promos || []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <AdminPageHeader screen="memberships" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Membership plans">
          <ul className="space-y-3">
            {plans.map((p) => (
              <li key={p.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Crown className="h-4 w-4 text-goldink" aria-hidden />
                    {p.name}
                  </p>
                  <AdminStatusPill status={p.active ? "Active" : "Paused"} />
                </div>
                <p className="mt-1 text-xs text-ink2">{p.benefits}</p>
                <form
                  className="mt-3 flex flex-wrap items-end gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    await adminJson("/api/admin/memberships", {
                      method: "PATCH",
                      body: JSON.stringify({ id: p.id, priceKobo: Number(fd.get("price")) * 100 })
                    });
                    load();
                  }}
                >
                  <FormRow label="Price ₦" htmlFor={`p-${p.id}`}>
                    <input id={`p-${p.id}`} name="price" type="number" defaultValue={p.priceKobo / 100} className={`${adminField} w-28`} />
                  </FormRow>
                  <button className={adminBtn}>Save</button>
                  <button
                    type="button"
                    className={adminBtnOutline}
                    onClick={async () => {
                      await adminJson("/api/admin/memberships", { method: "PATCH", body: JSON.stringify({ id: p.id, active: !p.active }) });
                      load();
                    }}
                  >
                    {p.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {p.active ? "Pause" : "Activate"}
                  </button>
                </form>
              </li>
            ))}
            {plans.length === 0 ? <p className="text-sm text-ink2">No membership plans in the database yet.</p> : null}
          </ul>
        </Panel>
        <Panel title="Promo codes">
          <form
            className="mb-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
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
              load();
            }}
          >
            <input name="code" required placeholder="CODE" className={adminField} />
            <input name="description" required placeholder="Description" className={adminField} />
            <input name="percentOff" type="number" min={0} max={100} placeholder="% off" className={adminField} />
            <input name="startsAt" type="datetime-local" required className={adminField} />
            <input name="endsAt" type="datetime-local" required className={adminField} />
            <button className={adminBtn}>
              <Tag className="h-3.5 w-3.5" /> Create promo
            </button>
          </form>
          <ul className="space-y-2">
            {promos.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-mono text-xs font-semibold">{p.code}</p>
                  <p className="text-[11px] text-ink2">
                    {p.description} · {p.percentOff}% · used {p.usedCount}
                  </p>
                </div>
                <button
                  type="button"
                  className={adminBtnOutline}
                  onClick={async () => {
                    await adminJson("/api/admin/promotions", { method: "PATCH", body: JSON.stringify({ id: p.id, active: !p.active }) });
                    load();
                  }}
                >
                  {p.active ? "Pause" : "Resume"}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
