"use client";

import { useMemo, useState } from "react";
import { Mail, Send, Users, Store } from "lucide-react";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";
import type { AnnouncementAudience, AnnouncementRecord } from "@/lib/announcements";

type Payload = {
  canEdit: boolean;
  mailConfigured: boolean;
  counts: { customers: number; vendors: number; all: number };
  history: AnnouncementRecord[];
};

const AUDIENCES: { id: AnnouncementAudience; label: string; hint: string; icon: typeof Users }[] = [
  { id: "customers", label: "Customers", hint: "Client accounts only", icon: Users },
  { id: "vendors", label: "Therapists", hint: "Vendor owners and staff", icon: Store },
  { id: "all", label: "Everyone", hint: "Customers and therapists", icon: Mail }
];

export function AnnouncementsConsole({ initial }: { initial: Payload }) {
  const [audience, setAudience] = useState<AnnouncementAudience>("customers");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Open NaijaSpa");
  const [ctaHref, setCtaHref] = useState("/explore");
  const [inApp, setInApp] = useState(true);
  const [history, setHistory] = useState(initial.history);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const count = initial.counts[audience];
  const audienceLabel = AUDIENCES.find((item) => item.id === audience)?.label ?? audience;
  const ready = subject.trim().length >= 4 && title.trim().length >= 4 && intro.trim().length >= 8 && body.trim().length >= 12;
  const previewTitle = title.trim() || "Announcement title";
  const previewIntro = intro.trim() || "A short opening line appears here.";
  const previewBody = body.trim() || "The rest of the update is shown in the branded NaijaSpa email.";

  const impact = useMemo(
    () => [
      `Sends to about ${count} ${audienceLabel.toLowerCase()} with email alerts on.`,
      inApp ? "Also posts an in-app notification." : "Email only — no in-app alert.",
      "People who turned email off, or deleted accounts, are skipped."
    ],
    [audienceLabel, count, inApp]
  );

  async function send() {
    if (busy || !initial.canEdit || !ready) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminJson<{ result: AnnouncementRecord }>("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          audience,
          subject: subject.trim(),
          title: title.trim(),
          intro: intro.trim(),
          body: body.trim(),
          ctaLabel: ctaLabel.trim(),
          ctaHref: ctaHref.trim(),
          inApp
        })
      });
      setHistory((rows) => [result.result, ...rows].slice(0, 30));
      setMessage(
        `Sent ${result.result.sent} of ${result.result.attempted}. ${result.result.skipped} skipped, ${result.result.failed} failed.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {!initial.mailConfigured ? (
        <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          SMTP is not configured on this server. Saves will fail in production until SMTP_HOST is set.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-goldink">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {AUDIENCES.map((item) => {
          const Icon = item.icon;
          const selected = audience === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAudience(item.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                selected ? "border-gold bg-gold/10 ring-1 ring-gold/40" : "border-line bg-card hover:border-gold/40"
              )}
            >
              <Icon className="h-5 w-5 text-goldink" aria-hidden />
              <p className="mt-3 font-semibold">{item.label}</p>
              <p className="mt-1 text-xs text-ink2">{item.hint}</p>
              <p className="mt-3 font-display text-2xl">{initial.counts[item.id]}</p>
              <p className="text-[11px] text-ink2">active accounts</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Compose"
          description="This uses the same branded forest-and-gold email as password resets and invites."
        >
          <div className="grid gap-3">
            <FormRow label="Email subject" htmlFor="ann-subject" hint="Shows in the inbox list.">
              <input
                id="ann-subject"
                className={adminField}
                maxLength={120}
                disabled={!initial.canEdit}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="NaijaSpa update: new cities this week"
              />
            </FormRow>
            <FormRow label="Headline" htmlFor="ann-title">
              <input
                id="ann-title"
                className={adminField}
                maxLength={80}
                disabled={!initial.canEdit}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="We’re live in more cities"
              />
            </FormRow>
            <FormRow label="Opening line" htmlFor="ann-intro">
              <textarea
                id="ann-intro"
                className={`${adminField} min-h-20`}
                maxLength={400}
                disabled={!initial.canEdit}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Hello, a short note from the NaijaSpa team."
              />
            </FormRow>
            <FormRow label="Message" htmlFor="ann-body" hint="Line breaks are kept in the email.">
              <textarea
                id="ann-body"
                className={`${adminField} min-h-36`}
                maxLength={4000}
                disabled={!initial.canEdit}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the update. Keep it clear. Avoid pasting HTML."
              />
            </FormRow>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormRow label="Button label" htmlFor="ann-cta-label">
                <input
                  id="ann-cta-label"
                  className={adminField}
                  maxLength={40}
                  disabled={!initial.canEdit}
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
              </FormRow>
              <FormRow label="Button link" htmlFor="ann-cta-href" hint="A site path like /explore or an https URL.">
                <input
                  id="ann-cta-href"
                  className={adminField}
                  maxLength={240}
                  disabled={!initial.canEdit}
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                />
              </FormRow>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inApp} disabled={!initial.canEdit} onChange={(e) => setInApp(e.target.checked)} />
              Also send an in-app notification
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink2">
                About {count} {audienceLabel.toLowerCase()} will be considered. Sending can take a minute on large lists.
              </p>
              <ConfirmAction
                triggerLabel={busy ? "Sending…" : "Review and send"}
                triggerIcon={Send}
                triggerVariant="default"
                disabled={!initial.canEdit || busy || !ready}
                title={`Send to ${audienceLabel.toLowerCase()}?`}
                description={`This emails about ${count} active ${audienceLabel.toLowerCase()}. You cannot unsend it.`}
                confirmLabel="Send emails"
                impact={impact}
                onConfirm={() => send()}
              />
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-2" title="Preview" description="How the email roughly reads.">
          <div className="rounded-2xl border border-gold/50 bg-[#064E3B] p-5 text-[#f4efe6]">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">NaijaSpa</p>
            <h3 className="mt-3 font-display text-2xl text-[#D4AF37]">{previewTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed">{previewIntro}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed opacity-90">{previewBody}</p>
            {ctaLabel.trim() && ctaHref.trim() ? (
              <p className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#064E3B]">{ctaLabel.trim()}</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="Recent sends" description="Last 30 announcement blasts from this console.">
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink2">
                <tr>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">To</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2 text-ink2">
                      {new Date(row.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                    </td>
                    <td className="py-2 capitalize">{row.audience}</td>
                    <td className="py-2">{row.subject}</td>
                    <td className="py-2">
                      {row.sent}/{row.attempted}
                      {row.failed ? ` · ${row.failed} failed` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink2">No announcements sent yet.</p>
        )}
      </Panel>
    </div>
  );
}
