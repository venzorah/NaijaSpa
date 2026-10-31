"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, FileText, FileX, Inbox, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterChips } from "@/components/admin/filter-chips";
import { adminBtn, adminBtnOutline } from "@/components/admin/form-row";
import { KeyValue } from "@/components/admin/key-value";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";

export type AdminApplication = {
  id: string;
  businessName: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  applicationStatus: string;
  submitted: string;
  documents: { id: string; kind: string; status: string; filePath: string; notes: string | null }[];
};

type Filter = "open" | "all" | "approved" | "rejected";

export function ApplicationsConsole({
  rows,
  editable,
  canViewProtected
}: {
  rows: AdminApplication[];
  editable: boolean;
  canViewProtected: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("open");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const [docId, setDocId] = useState(rows[0]?.documents[0]?.id ?? "");

  const filtered = rows.filter((a) => {
    if (filter === "all") return true;
    if (filter === "approved") return a.applicationStatus === "approved";
    if (filter === "rejected") return a.applicationStatus === "rejected";
    return ["draft", "submitted", "under_review"].includes(a.applicationStatus);
  });
  const app = filtered.find((a) => a.id === selectedId) ?? filtered[0];
  const doc = app?.documents.find((d) => d.id === docId) ?? app?.documents[0];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <Panel bodyClassName="p-0">
        <div className="border-b border-line p-3">
          <FilterChips
            label="Filter applications"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open", count: rows.filter((a) => ["draft", "submitted", "under_review"].includes(a.applicationStatus)).length },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All" }
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="Queue is clear" text="No applications in this view." />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(a.id);
                    setDocId(a.documents[0]?.id ?? "");
                  }}
                  className={cn("w-full px-3 py-3 text-left hover:bg-elev/60", a.id === app?.id && "bg-gold/5 shadow-[inset_2px_0_0_#d4af37]")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{a.businessName}</span>
                    <AdminStatusPill status={a.applicationStatus} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink2">
                    {a.city} · {a.submitted}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="min-w-0 space-y-3">
        {app && doc ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Documents">
              {app.documents.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={d.id === doc.id}
                  onClick={() => setDocId(d.id)}
                  className={cn("flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs", d.id === doc.id ? "border-gold/50 bg-gold/5" : "border-line bg-card")}
                >
                  <FileText className="h-4 w-4 text-ink2" aria-hidden />
                  <span>
                    <span className="block font-medium">{d.kind}</span>
                    <AdminStatusPill status={d.status} className="mt-0.5" />
                  </span>
                </button>
              ))}
            </div>
            <Panel title={doc.kind} description={canViewProtected ? "Protected document" : "Redacted for your role"}>
              {canViewProtected ? (
                <p className="break-all font-mono text-xs text-ink2">{doc.filePath}</p>
              ) : (
                <p className="text-sm text-ink2">Only Super administrators and verification officers can open KYC files.</p>
              )}
              {doc.notes ? <p className="mt-2 text-xs">Notes: {doc.notes}</p> : null}
            </Panel>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={adminBtnOutline}
                disabled={!editable || !canViewProtected}
                onClick={async () => {
                  await adminJson(`/api/admin/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) });
                  router.refresh();
                }}
              >
                <FileX className="h-3.5 w-3.5" aria-hidden /> Reject document
              </button>
              <button
                type="button"
                className={adminBtn}
                disabled={!editable || !canViewProtected}
                onClick={async () => {
                  await adminJson(`/api/admin/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ status: "verified" }) });
                  router.refresh();
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Mark verified
              </button>
            </div>
          </>
        ) : (
          <Panel>
            <EmptyState icon={FileText} title="No documents" text="This applicant has not uploaded documents yet." />
          </Panel>
        )}
      </div>
      {app ? (
        <div className="space-y-4">
          <Panel title={app.businessName} description={`Submitted ${app.submitted}`}>
            <KeyValue
              columns={1}
              items={[
                { label: "Owner", value: app.ownerName },
                { label: "Email", value: app.ownerEmail },
                { label: "City", value: app.city }
              ]}
            />
          </Panel>
          <Panel title="Verification checks">
            <ul className="space-y-2">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-start gap-2 text-xs">
                  {d.status === "verified" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-forest" aria-label="Passed" /> : null}
                  {d.status === "rejected" ? <XCircle className="mt-0.5 h-3.5 w-3.5 text-red-600" aria-label="Failed" /> : null}
                  {d.status === "submitted" ? <Circle className="mt-0.5 h-3.5 w-3.5 text-ink2" aria-label="Pending" /> : null}
                  {d.kind} · {d.status}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Decision">
            <div className="flex flex-col gap-2">
              <ConfirmAction
                triggerLabel="Approve application"
                triggerIcon={CheckCircle2}
                triggerVariant="default"
                triggerClassName="w-full"
                disabled={!editable || app.applicationStatus === "approved"}
                title={`Approve ${app.businessName}?`}
                description="The vendor can become public. No password is generated by admins."
                confirmLabel="Approve"
                onConfirm={async () => {
                  await adminJson(`/api/admin/vendors/${app.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ applicationStatus: "approved", visibility: "public", verificationStatus: "verified" })
                  });
                  router.refresh();
                }}
              />
              <ConfirmAction
                triggerLabel="Reject application"
                triggerIcon={XCircle}
                triggerVariant="ghost"
                triggerClassName="w-full"
                disabled={!editable || app.applicationStatus === "rejected"}
                title={`Reject ${app.businessName}?`}
                description="The applicant may reapply later."
                confirmLabel="Reject application"
                requireReason
                onConfirm={async () => {
                  await adminJson(`/api/admin/vendors/${app.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ applicationStatus: "rejected", visibility: "hidden" })
                  });
                  router.refresh();
                }}
              />
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
