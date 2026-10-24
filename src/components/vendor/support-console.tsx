"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

export function VendorSupportConsole({
  tickets
}: {
  tickets: { id: string; subject: string; status: string; createdAt: string; preview: string }[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await adminJson("/api/vendor/tickets", { method: "POST", body: JSON.stringify({ subject, message }) });
      setSubject("");
      setMessage("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <VendorPageHeader title="Support" description="Talk to NaijaSpa about verification, payouts and your listing." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="New ticket">
          <FormRow label="Subject" htmlFor="t-sub">
            <input id="t-sub" className={adminField} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </FormRow>
          <div className="mt-3">
            <FormRow label="Message" htmlFor="t-msg">
              <textarea id="t-msg" rows={5} className={adminField} value={message} onChange={(e) => setMessage(e.target.value)} />
            </FormRow>
          </div>
          <button type="button" className={`${adminBtn} mt-4`} disabled={busy || subject.length < 4 || message.length < 4} onClick={send}>
            {busy ? "Sending…" : "Send ticket"}
          </button>
        </Panel>
        <Panel title="Your tickets" bodyClassName="p-0">
          {tickets.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No tickets yet.</p> : null}
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.subject}</p>
                  <AdminStatusPill status={t.status} />
                </div>
                <p className="mt-1 text-xs text-ink2">{t.createdAt}</p>
                {t.preview ? <p className="mt-1 text-xs text-ink2">{t.preview}</p> : null}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
