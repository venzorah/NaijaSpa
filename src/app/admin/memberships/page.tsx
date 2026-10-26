"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Tag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatCount, formatNgn } from "@/lib/money";
import { MEMBERSHIP_INTERVALS, membershipIntervalLabel, monthlyRecurringKobo, parseBenefits } from "@/lib/membership";
import { VendorPlansConsole } from "@/components/admin/vendor-plans-console";

type Plan = {
  id: string;
  code: string;
  name: string;
  interval: string;
  priceKobo: number;
  benefits: string;
  active: boolean;
  memberCount: number;
};
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

export default function MembershipsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/memberships");
    if (res.ok) {
      const json = await res.json();
      setPlans(json.plans || []);
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
        Live admin can edit every price, billing period and benefit. Paid packages bill weekly, monthly or yearly. Free has no subscription fee.
      </p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <h2 className="mb-3 font-display text-xl">Therapist listing plans</h2>
      <p className="mb-3 text-sm text-ink2">
        Free: ₦0 and commission on successful bookings. Silver weekly, Gold monthly, Platinum yearly — live amounts, fully editable. Create extra packages below.
      </p>
      <VendorPlansConsole />
      <h2 className="mb-3 font-display text-xl">Customer booking club</h2>
      {!canEdit ? (
        <p className="mb-3 text-sm text-ink2">View only. Price, billing, benefits and promo codes are edited by the live admin.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {plans.map((p) => {
          const perks = parseBenefits(p.benefits);
          const mrr = monthlyRecurringKobo(p.priceKobo, p.interval) * (p.memberCount || 0);
          return (
            <Panel
              key={p.id}
              title={p.name}
              actions={
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.active}
                  aria-label={p.active ? "Pause plan" : "Activate plan"}
                  disabled={!canEdit}
                  className={`relative h-6 w-11 shrink-0 rounded-full ${p.active ? "bg-leaf" : "bg-elev"} disabled:opacity-50`}
                  onClick={async () => {
                    if (!canEdit) return;
                    setError("");
                    try {
                      await adminJson("/api/admin/memberships", {
                        method: "PATCH",
                        body: JSON.stringify({ id: p.id, active: !p.active })
                      });
                      load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not update plan.");
                    }
                  }}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${p.active ? "right-0.5" : "left-0.5"}`} />
                </button>
              }
            >
              <p className="flex items-center gap-1.5 text-xs text-ink2">
                <Crown className="h-3.5 w-3.5 text-goldink" aria-hidden />
                {formatCount(p.memberCount || 0)} members · {p.code}
              </p>
              <form
                className="mt-3 grid grid-cols-2 gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  const fd = new FormData(e.currentTarget);
                  try {
                    await adminJson("/api/admin/memberships", {
                      method: "PATCH",
                      body: JSON.stringify({
                        id: p.id,
                        name: fd.get("name"),
                        priceKobo: Math.round(Number(fd.get("price") || 0) * 100),
                        interval: fd.get("interval"),
                        benefits: String(fd.get("benefits") || "")
                      })
                    });
                    load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not save plan.");
                  }
                }}
              >
                <FormRow label="Name" htmlFor={`name-${p.id}`}>
                  <input id={`name-${p.id}`} name="name" defaultValue={p.name} disabled={!canEdit} className={adminField} />
                </FormRow>
                <FormRow label="Price (₦)" htmlFor={`price-${p.id}`}>
                  <input
                    id={`price-${p.id}`}
                    name="price"
                    type="number"
                    min={0}
                    defaultValue={Math.round(p.priceKobo / 100)}
                    disabled={!canEdit}
                    className={adminField}
                  />
                </FormRow>
                <FormRow label="Billing" htmlFor={`int-${p.id}`}>
                  <select id={`int-${p.id}`} name="interval" defaultValue={p.interval === "none" || p.priceKobo <= 0 ? "none" : p.interval} disabled={!canEdit} className={adminField}>
                    {MEMBERSHIP_INTERVALS.map((i) => (
                      <option key={i} value={i}>
                        {membershipIntervalLabel(i)}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <div className="col-span-2">
                  <FormRow label="Benefits (one per line)" htmlFor={`ben-${p.id}`}>
                    <textarea id={`ben-${p.id}`} name="benefits" rows={4} defaultValue={perks.join("\n")} disabled={!canEdit} className={adminField} />
                  </FormRow>
                </div>
                <ul className="col-span-2 space-y-1">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-ink2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
                      {perk}
                    </li>
                  ))}
                </ul>
                <p className="col-span-2 text-xs text-ink2">MRR ≈ {formatNgn(mrr)}</p>
                {canEdit ? <button className={`${adminBtn} col-span-2`}>Save plan</button> : null}
              </form>
            </Panel>
          );
        })}
        {canEdit ? (
        <Panel title="Create plan">
          <p className="text-sm text-ink2">Add Free (₦0, no billing) or a paid weekly, monthly or yearly club plan. Customers see active plans on Membership.</p>
          <form
            className="mt-3 grid gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData(e.currentTarget);
              try {
                await adminJson("/api/admin/memberships", {
                  method: "POST",
                  body: JSON.stringify({
                    name: fd.get("name"),
                    code: fd.get("code") || undefined,
                    interval: fd.get("interval"),
                    priceKobo: Math.round(Number(fd.get("price") || 0) * 100),
                    benefits: String(fd.get("benefits") || "")
                  })
                });
                e.currentTarget.reset();
                load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create plan.");
              }
            }}
          >
            <FormRow label="Name" htmlFor="new-name">
              <input id="new-name" name="name" required placeholder="Silver" className={adminField} />
            </FormRow>
            <FormRow label="Code (optional)" htmlFor="new-code" hint="Letters and numbers. Blank uses NAME plus billing, or FREE.">
              <input id="new-code" name="code" placeholder="SILVER_MONTHLY" className={adminField} />
            </FormRow>
            <div className="grid grid-cols-2 gap-2">
              <FormRow label="Price (₦)" htmlFor="new-price">
                <input id="new-price" name="price" type="number" min={0} required placeholder="5000" className={adminField} />
              </FormRow>
              <FormRow label="Billing" htmlFor="new-int">
                <select id="new-int" name="interval" defaultValue="monthly" className={adminField}>
                  <option value="none">No subscription fee (Free)</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </FormRow>
            </div>
            <FormRow label="Benefits (one per line)" htmlFor="new-ben">
              <textarea id="new-ben" name="benefits" rows={4} placeholder={"5% off bookings\nPriority support"} className={adminField} />
            </FormRow>
            <button className={adminBtn}>Create plan</button>
          </form>
        </Panel>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
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
