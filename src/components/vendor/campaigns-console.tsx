"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatCount } from "@/lib/money";

export function VendorCampaignsConsole({
  eligible,
  services,
  rows
}: {
  eligible: boolean;
  services: { id: string; name: string }[];
  rows: {
    id: string;
    placement: string;
    service: string;
    active: boolean;
    impressions: number;
    clicks: number;
    window: string;
  }[];
}) {
  const router = useRouter();
  const [placement, setPlacement] = useState("home_hero");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await adminJson("/api/vendor/campaigns", {
        method: "POST",
        body: JSON.stringify({ placement, serviceId: serviceId || undefined, startsAt, endsAt })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await adminJson("/api/vendor/campaigns", { method: "PATCH", body: JSON.stringify({ id, active }) });
    router.refresh();
  }

  return (
    <div>
      <VendorPageHeader title="Sponsored" description="Boost a listing on home, search and category placements." />
      {!eligible ? (
        <Panel className="mb-4 border-gold/40">
          <p className="text-sm">Sponsored placements are available on eligible paid plans.</p>
          <Link href="/vendor/subscriptions" className={`${adminBtn} mt-3`}>
            Compare plans
          </Link>
        </Panel>
      ) : (
        <Panel className="mb-4" title="New campaign">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormRow label="Placement" htmlFor="c-place">
              <select id="c-place" className={adminField} value={placement} onChange={(e) => setPlacement(e.target.value)}>
                <option value="home_hero">Home hero</option>
                <option value="search">Search</option>
                <option value="category">Category</option>
              </select>
            </FormRow>
            <FormRow label="Service" htmlFor="c-svc">
              <select id="c-svc" className={adminField} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Whole business</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Starts" htmlFor="c-start">
              <input id="c-start" type="datetime-local" className={adminField} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </FormRow>
            <FormRow label="Ends" htmlFor="c-end">
              <input id="c-end" type="datetime-local" className={adminField} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </FormRow>
          </div>
          <button type="button" className={`${adminBtn} mt-3`} disabled={busy || !startsAt || !endsAt} onClick={create}>
            {busy ? "Creating…" : "Create campaign"}
          </button>
        </Panel>
      )}
      <Panel title="Your campaigns" bodyClassName="p-0">
        {rows.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No campaigns yet.</p> : null}
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{c.placement.replace(/_/g, " ")}</p>
                <p className="text-xs text-ink2">
                  {c.service} · {c.window}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>{formatCount(c.impressions)} imp</span>
                <span>{formatCount(c.clicks)} clicks</span>
                <AdminStatusPill status={c.active ? "Live" : "Paused"} />
                <button type="button" className={adminBtnOutline} onClick={() => toggle(c.id, !c.active)}>
                  {c.active ? "Pause" : "Resume"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
