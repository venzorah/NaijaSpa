"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { formatCount, formatNgn } from "@/lib/money";
import { billingFromDurationDays, vendorPlanBillingLabel } from "@/lib/vendor-plans";

type Plan = {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  priceKobo: number;
  commissionBps: number;
  publicDirectContact: boolean;
  enhancedVisibility: boolean;
  sponsoredEligible: boolean;
  active: boolean;
  subscriberCount: number;
};

export function VendorPlansConsole() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/vendor-plans");
    if (!res.ok) return;
    const json = await res.json();
    setPlans(json.plans || []);
    setCanEdit(Boolean(json.canEdit));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mb-4">
      <p className="mb-3 text-sm text-ink2">
        Therapist listing packages. Free takes commission on each successful booking. Silver, Gold and Platinum are billed weekly, monthly and yearly unless you change them. Missed renewal returns the listing to Free.
      </p>
      {!canEdit ? <p className="mb-3 text-sm text-ink2">View only. The live admin edits prices, billing and commission.</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {plans.map((p) => {
          const billing = billingFromDurationDays(p.durationDays, p.priceKobo);
          return (
            <Panel
              key={p.id}
              title={p.name}
              actions={
                p.code === "FREE" ? (
                  <AdminStatusPill status="Default" />
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.active}
                    disabled={!canEdit}
                    className={`relative h-6 w-11 shrink-0 rounded-full ${p.active ? "bg-leaf" : "bg-elev"} disabled:opacity-50`}
                    onClick={async () => {
                      if (!canEdit) return;
                      setError("");
                      try {
                        await adminJson("/api/admin/vendor-plans", {
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
                )
              }
            >
              <p className="text-xs text-ink2">
                {formatCount(p.subscriberCount || 0)} listings · {p.code} · {vendorPlanBillingLabel(p.durationDays, p.priceKobo)}
              </p>
              <form
                className="mt-3 grid grid-cols-2 gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  const fd = new FormData(e.currentTarget);
                  try {
                    await adminJson("/api/admin/vendor-plans", {
                      method: "PATCH",
                      body: JSON.stringify({
                        id: p.id,
                        name: fd.get("name"),
                        priceKobo: Math.round(Number(fd.get("price") || 0) * 100),
                        billing: fd.get("billing"),
                        commissionBps: Math.round(Number(fd.get("commission") || 0) * 100),
                        publicDirectContact: fd.get("contact") === "on",
                        enhancedVisibility: fd.get("visibility") === "on",
                        sponsoredEligible: fd.get("sponsored") === "on"
                      })
                    });
                    load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not save plan.");
                  }
                }}
              >
                <FormRow label="Name" htmlFor={`vp-name-${p.id}`}>
                  <input id={`vp-name-${p.id}`} name="name" defaultValue={p.name} disabled={!canEdit} className={adminField} />
                </FormRow>
                <FormRow label="Price (₦)" htmlFor={`vp-price-${p.id}`}>
                  <input
                    id={`vp-price-${p.id}`}
                    name="price"
                    type="number"
                    min={0}
                    defaultValue={Math.round(p.priceKobo / 100)}
                    disabled={!canEdit || p.code === "FREE"}
                    className={adminField}
                  />
                </FormRow>
                <FormRow label="Billing" htmlFor={`vp-bill-${p.id}`}>
                  <select id={`vp-bill-${p.id}`} name="billing" defaultValue={billing} disabled={!canEdit || p.code === "FREE"} className={adminField}>
                    <option value="none">None (Free)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </FormRow>
                <FormRow label="Commission %" htmlFor={`vp-com-${p.id}`}>
                  <input
                    id={`vp-com-${p.id}`}
                    name="commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    defaultValue={p.commissionBps / 100}
                    disabled={!canEdit}
                    className={adminField}
                  />
                </FormRow>
                <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm">
                  <input
                    name="contact"
                    type="checkbox"
                    defaultChecked={p.code !== "FREE" && p.publicDirectContact}
                    disabled={!canEdit || p.code === "FREE"}
                  />
                  Public phone & WhatsApp {p.code === "FREE" ? "(paid plans only)" : ""}
                </label>
                <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm">
                  <input name="visibility" type="checkbox" defaultChecked={p.enhancedVisibility} disabled={!canEdit} />
                  Enhanced visibility
                </label>
                <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm">
                  <input name="sponsored" type="checkbox" defaultChecked={p.sponsoredEligible} disabled={!canEdit} />
                  Sponsored eligible
                </label>
                <p className="col-span-2 flex items-start gap-2 text-xs text-ink2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
                  {p.code === "FREE"
                    ? "No weekly, monthly or annual fee. Commission applies on successful bookings. Phone and WhatsApp stay hidden from the public."
                    : "If the vendor does not renew after grace, the listing returns to Free and public contact is hidden."}
                </p>
                {canEdit ? <button className={`${adminBtn} col-span-2`}>Save listing plan</button> : null}
              </form>
            </Panel>
          );
        })}
        {canEdit ? (
          <Panel title="Create listing plan">
            <p className="text-sm text-ink2">Add another therapist package. Customers never see these prices — they are listing fees.</p>
            <form
              className="mt-3 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                const fd = new FormData(e.currentTarget);
                try {
                  await adminJson("/api/admin/vendor-plans", {
                    method: "POST",
                    body: JSON.stringify({
                      name: fd.get("name"),
                      code: fd.get("code") || undefined,
                      billing: fd.get("billing"),
                      priceKobo: Math.round(Number(fd.get("price") || 0) * 100),
                      commissionBps: Math.round(Number(fd.get("commission") || 0) * 100)
                    })
                  });
                  e.currentTarget.reset();
                  load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not create plan.");
                }
              }}
            >
              <FormRow label="Name" htmlFor="new-vp-name">
                <input id="new-vp-name" name="name" required placeholder="Silver" className={adminField} />
              </FormRow>
              <FormRow label="Code (optional)" htmlFor="new-vp-code" hint="Blank uses the name in capitals.">
                <input id="new-vp-code" name="code" placeholder="SILVER" className={adminField} />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Price (₦)" htmlFor="new-vp-price">
                  <input id="new-vp-price" name="price" type="number" min={0} required placeholder="50000" className={adminField} />
                </FormRow>
                <FormRow label="Billing" htmlFor="new-vp-bill">
                  <select id="new-vp-bill" name="billing" defaultValue="weekly" className={adminField}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="none">None</option>
                  </select>
                </FormRow>
              </div>
              <FormRow label="Commission %" htmlFor="new-vp-com">
                <input id="new-vp-com" name="commission" type="number" min={0} max={100} step={0.1} defaultValue={0} className={adminField} />
              </FormRow>
              <button className={adminBtn}>Create listing plan</button>
            </form>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
