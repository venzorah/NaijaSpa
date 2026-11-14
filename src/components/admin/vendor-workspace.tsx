"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Plus } from "lucide-react";
import { VendorDetailsForm } from "./vendor-details-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { AdminImageField } from "@/components/admin/image-field";
import { KeyValue } from "@/components/admin/key-value";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { ServiceEditorModal, type ServiceEditorValue } from "@/components/service-editor-modal";
import { vendorStatusLabel } from "@/lib/admin";
import { formatNgn } from "@/lib/money";
import { vendorPlanBillingLabel } from "@/lib/vendor-plans";
import { verificationDocLabel } from "@/lib/verification-doc-kinds";
import { cn } from "@/lib/cn";
import type { AdminVendorRow } from "./vendors-console";
import { AdminVendorPageLink } from "./vendor-page-link";
import { CopyAdLinks } from "./copy-ad-links";
import { formatAdClicks, formatAdminClicks, formatViews } from "@/lib/listing-views";

type Tab = "overview" | "profile" | "photos" | "services" | "kyc";
type Doc = { id: string; kind: string; status: string; createdAt: string; mimeType: string; byteSize: number };
type ServiceRow = ServiceEditorValue & { active: boolean; slug: string };
type Detail = {
  coverUrl: string;
  logoUrl: string;
  documents: Doc[];
  services: ServiceRow[];
};
type HitRow = { id: string; kind: string; channel: string; source: string; campaign: string; createdAt: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "photos", label: "Photos" },
  { id: "services", label: "Services" },
  { id: "kyc", label: "KYC" }
];

export function VendorWorkspace({
  vendor,
  editable,
  listingPlans,
  msg,
  setMsg,
  busy,
  setBusy,
  onStatus
}: {
  vendor: AdminVendorRow;
  editable: boolean;
  listingPlans: Array<{ code: string; name: string; priceKobo: number; durationDays: number; active: boolean }>;
  msg: string;
  setMsg: (value: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onStatus: (id: string, applicationStatus: string, extra?: Record<string, string>) => Promise<void>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<ServiceRow | "new" | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [hits, setHits] = useState<HitRow[]>([]);
  const [hitTotals, setHitTotals] = useState({ views: vendor.publicViewCount, adClicks: vendor.publicClickCount, adminClicks: vendor.adminClickCount, organicClicks: 0 });

  useEffect(() => {
    let ignore = false;
    setDetail(null);
    setLoadError("");
    setTab("overview");
    void Promise.all([
      fetch(`/api/admin/vendors/${vendor.id}`).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load vendor.");
        return data;
      }),
      fetch(`/api/admin/vendors/${vendor.id}/hits`).then(async (res) => (res.ok ? res.json() : { hits: [], totals: null }))
    ])
      .then(([data, traffic]) => {
        if (ignore) return;
        setDetail({
          coverUrl: data.vendor.coverUrl || "",
          logoUrl: data.vendor.logoUrl || "",
          documents: data.vendor.documents ?? [],
          services: data.vendor.services ?? []
        });
        setCategories(data.categories ?? []);
        setHits(traffic.hits ?? []);
        if (traffic.totals) setHitTotals(traffic.totals);
      })
      .catch((error) => {
        if (!ignore) setLoadError(error instanceof Error ? error.message : "Could not load vendor.");
      });
    return () => {
      ignore = true;
    };
  }, [vendor.id]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">{vendor.businessName}</h3>
          <p className="mt-1 text-sm text-ink2">
            {vendor.slug} · {vendor.plan}
          </p>
        </div>
        <AdminStatusPill status={vendorStatusLabel(vendor.applicationStatus)} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-elev/40 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              tab === item.id ? "bg-card text-ink shadow-sm" : "text-ink2 hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loadError ? <p className="mb-3 text-sm text-red-600">{loadError}</p> : null}
      {msg ? <p className="mb-3 text-sm text-goldink" role="status">{msg}</p> : null}

      {tab === "overview" ? (
        <Panel title="Listing" description="Approve, suspend, or grant a listing plan. Other tabs edit the public profile.">
          <KeyValue
            items={[
              { label: "Owner", value: vendor.ownerName },
              { label: "Email", value: <span className="break-all">{vendor.ownerEmail}</span> },
              { label: "State", value: vendor.state },
              { label: "Address", value: <span className="break-words">{vendor.address || "Not provided"}</span> },
              { label: "Mobile number", value: vendor.mobile ? <a href={`tel:${vendor.mobile}`} className="text-goldink underline">{vendor.mobile}</a> : "Not provided" },
              { label: "WhatsApp number", value: vendor.whatsapp || "Not provided" },
              { label: "City", value: `${vendor.neighbourhood ? `${vendor.neighbourhood}, ` : ""}${vendor.city}` },
              { label: "Verification", value: vendor.verificationStatus },
              { label: "Visibility", value: vendor.visibility },
              { label: "Services", value: detail?.services.length ?? vendor.services },
              { label: "Reviews", value: `${vendor.reviewCount} · ${vendor.ratingAvg.toFixed(1)} avg` },
              { label: "Public views", value: formatViews(hitTotals.views || vendor.publicViewCount) },
              { label: "Ad clicks", value: formatAdClicks(hitTotals.adClicks || vendor.publicClickCount) },
              { label: "Admin clicks", value: formatAdminClicks(hitTotals.adminClicks || vendor.adminClickCount) },
              { label: "Plan", value: vendor.plan },
              { label: "Public contact", value: vendor.publicContactEnabled ? "Visible on Explore" : "Hidden" }
            ]}
          />
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium">Ad landing links</p>
            <p className="mt-1 text-xs text-ink2">
              Paste these into Facebook, Instagram, Google or TikTok. Each tap is stored as an ad click, then the page view is counted separately.
            </p>
            <div className="mt-2">
              <CopyAdLinks slug={vendor.slug} kind="vendor" campaign={vendor.slug} />
            </div>
            {detail?.services.length ? (
              <ul className="mt-3 space-y-2">
                {detail.services.map((service) => (
                  <li key={service.id} className="rounded-lg border border-line px-3 py-2">
                    <p className="text-xs font-medium">{service.name}</p>
                    <div className="mt-1">
                      <CopyAdLinks slug={service.slug} kind="service" campaign={vendor.slug} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {hits.length ? (
              <ul className="mt-3 max-h-40 overflow-y-auto text-[11px] text-ink2">
                {hits.slice(0, 12).map((hit) => (
                  <li key={hit.id} className="flex justify-between gap-2 border-t border-line py-1">
                    <span>
                      {hit.kind} · {hit.channel}
                      {hit.source ? ` · ${hit.source}` : ""}
                      {hit.campaign ? ` · ${hit.campaign}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">{new Date(hit.createdAt).toLocaleString("en-NG")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-ink2">No recorded clicks or views yet. Use the ad links above so every campaign tap is stored.</p>
            )}
          </div>
          <form
            className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setMsg("");
              try {
                await adminJson(`/api/admin/vendors/${vendor.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ publicContactEnabled: !vendor.publicContactEnabled })
                });
                setMsg(
                  vendor.publicContactEnabled
                    ? "Public phone, WhatsApp, email and Instagram are hidden on Explore."
                    : "Public contact is now visible on Explore and the provider page."
                );
                router.refresh();
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Could not update public contact.");
              }
            }}
          >
            <p className="text-sm text-ink2">
              Contact and social links stay off Explore until you turn them on. Customers still get WhatsApp and in-app chat after they pay.
            </p>
            <button className={adminBtnOutline} disabled={!editable} type="submit">
              {vendor.publicContactEnabled ? "Hide public contact" : "Show public contact"}
            </button>
          </form>
          <form
            className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const planCode = String(fd.get("planCode") || "");
              setMsg("");
              try {
                await adminJson(`/api/admin/vendors/${vendor.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ planCode })
                });
                const granted = listingPlans.find((p) => p.code === planCode);
                setMsg(
                  granted && granted.priceKobo > 0
                    ? `${granted.name} granted for one billing period. Paystack is not charged.`
                    : "Listing plan updated."
                );
                router.refresh();
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Could not update listing plan.");
              }
            }}
          >
            <FormRow label="Grant listing plan" htmlFor="vendor-plan">
              <select id="vendor-plan" name="planCode" defaultValue={vendor.planCode} disabled={!editable} className={adminField} key={vendor.id + vendor.planCode}>
                {listingPlans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                    {p.priceKobo > 0 ? ` · ${formatNgn(p.priceKobo)} · ${vendorPlanBillingLabel(p.durationDays, p.priceKobo)}` : " · ₦0"}
                    {p.active ? "" : " (paused)"}
                  </option>
                ))}
              </select>
            </FormRow>
            <button className={adminBtn} disabled={!editable}>
              Grant plan
            </button>
            <p className="sm:col-span-2 text-xs text-ink2">
              Upgrade to Silver, Gold, Platinum, or any extra package from Commercial config. This is an admin grant — the vendor is not billed on Paystack.
            </p>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <AdminVendorPageLink vendorId={vendor.id} slug={vendor.slug} />
            <ConfirmAction
              triggerLabel="Approve"
              triggerVariant="default"
              disabled={!editable || vendor.applicationStatus === "approved"}
              title={`Approve ${vendor.businessName}?`}
              description="The listing can go public. The owner already has a setup path if they were invited."
              confirmLabel="Approve vendor"
              onConfirm={() => onStatus(vendor.id, "approved", { visibility: "public", verificationStatus: "verified" })}
            />
            <ConfirmAction
              triggerLabel="Suspend"
              disabled={!editable || vendor.applicationStatus === "suspended"}
              title={`Suspend ${vendor.businessName}?`}
              description="The listing is hidden from search. Existing bookings stay unless cancelled separately."
              confirmLabel="Suspend vendor"
              requireReason
              onConfirm={() => onStatus(vendor.id, "suspended", { visibility: "hidden" })}
            />
            <ConfirmAction
              triggerLabel="Delete vendor"
              triggerClassName="text-red-600 border-red-300"
              disabled={!editable}
              title={`Delete ${vendor.businessName}?`}
              description="The business, login email, phone and images are removed. Paid bookings stay for accounting without the original contact details, so the email can be used again."
              confirmLabel="Delete vendor"
              requireReason
              onConfirm={async (reason) => {
                await adminJson(`/api/admin/vendors/${vendor.id}`, { method: "DELETE", body: JSON.stringify({ reason }) });
                router.refresh();
              }}
            />
          </div>
        </Panel>
      ) : null}

      {tab === "profile" ? (
        editable ? (
          <VendorDetailsForm
            key={vendor.id}
            vendor={vendor}
            busy={busy}
            setBusy={setBusy}
            onCancel={() => setTab("overview")}
            onSaved={() => {
              router.refresh();
              setMsg("Profile saved.");
              setTab("overview");
            }}
          />
        ) : (
          <p className="text-sm text-ink2">Your role can view this listing. Editing requires Manage vendors.</p>
        )
      ) : null}

      {tab === "photos" ? (
        detail ? (
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editable || busy) return;
              const form = new FormData(event.currentTarget);
              const coverUrl = String(form.get("coverUrl") ?? "");
              const logoUrl = String(form.get("logoUrl") ?? "");
              setBusy(true);
              setMsg("");
              try {
                await adminJson(`/api/admin/vendors/${vendor.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ coverUrl, logoUrl })
                });
                setDetail((current) => (current ? { ...current, coverUrl, logoUrl } : current));
                setMsg("Photos saved.");
                router.refresh();
              } catch (error) {
                setMsg(error instanceof Error ? error.message : "Could not save photos.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <AdminImageField key={`${vendor.id}-cover`} name="coverUrl" label="Cover image" defaultValue={detail.coverUrl} />
            <AdminImageField key={`${vendor.id}-logo`} name="logoUrl" label="Logo" defaultValue={detail.logoUrl} />
            <div className="flex justify-end">
              <button type="submit" className={adminBtn} disabled={!editable || busy}>
                {busy ? "Saving…" : "Save photos"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-ink2">Loading photos…</p>
        )
      ) : null}

      {tab === "services" ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink2">{detail?.services.length ?? 0} treatments on this listing.</p>
            {editable ? (
              <button type="button" className={adminBtn} onClick={() => setEditor("new")}>
                <Plus className="h-3.5 w-3.5" /> Add service
              </button>
            ) : null}
          </div>
          {detail?.services.length ? (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {detail.services.map((service) => (
                <li key={service.id} className="flex items-center gap-3 p-3">
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-elev">
                      <ImagePlus className="h-4 w-4 text-ink2" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{service.name}</span>
                    <span className="text-xs text-ink2">
                      {formatNgn(service.basePriceKobo)} · {service.durationMin} min · {service.active ? "Live" : "Hidden"}
                    </span>
                  </span>
                  {editable ? (
                    <button type="button" className={adminBtnOutline} onClick={() => setEditor(service)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink2">No services yet.</p>
          )}
        </div>
      ) : null}

      {tab === "kyc" ? (
        <div className="grid gap-3">
          <p className="text-sm text-ink2">Identity, CAC and licence uploads from onboarding. Images stay private to admin.</p>
          {detail?.documents.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setPreview(doc)}
                  className="overflow-hidden rounded-2xl border border-line text-left hover:border-gold/50"
                >
                  <img src={`/api/admin/documents/${doc.id}/file`} alt={verificationDocLabel(doc.kind)} className="h-44 w-full object-cover bg-elev" />
                  <span className="block p-3">
                    <span className="block text-sm font-semibold">{verificationDocLabel(doc.kind)}</span>
                    <span className="text-xs text-ink2">
                      {doc.status} · {new Date(doc.createdAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink2">No KYC images uploaded yet.</p>
          )}
        </div>
      ) : null}

      {editor ? (
        <ServiceEditorModal
          admin
          categories={categories}
          vendors={[{ id: vendor.id, businessName: vendor.businessName }]}
          value={editor === "new" ? undefined : { ...editor, vendorId: vendor.id }}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            router.refresh();
            void fetch(`/api/admin/vendors/${vendor.id}`)
              .then((res) => res.json())
              .then((data) => {
                if (!data?.vendor) return;
                setDetail((current) =>
                  current
                    ? { ...current, services: data.vendor.services ?? current.services }
                    : current
                );
              });
          }}
        />
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div role="dialog" aria-modal="true" aria-label={verificationDocLabel(preview.kind)} tabIndex={-1} className="max-h-[90dvh] w-full max-w-3xl overflow-auto rounded-2xl bg-card p-4" onKeyDown={(e) => { if (e.key === "Escape") setPreview(null); }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">{verificationDocLabel(preview.kind)}</p>
              <button type="button" className={adminBtnOutline} onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            <img src={`/api/admin/documents/${preview.id}/file`} alt={verificationDocLabel(preview.kind)} className="w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
