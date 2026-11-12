"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare, Send, UserRound, Users, Store } from "lucide-react";
import { adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminJson } from "@/components/admin/json";
import { AnnouncementMedia } from "@/components/admin/announcement-media";
import { cn } from "@/lib/cn";
import type { AnnouncementImage, AnnouncementLink } from "@/lib/announcement-content";
import type { AnnouncementAudience, AnnouncementChannel, AnnouncementRecord } from "@/lib/announcements";

type Person = { id: string; name: string; email: string; role: string };
type Payload = {
  canEdit: boolean;
  mailConfigured: boolean;
  counts: { customers: number; vendors: number; all: number };
  history: AnnouncementRecord[];
};

const AUDIENCES: { id: AnnouncementAudience; label: string; hint: string; icon: typeof Users }[] = [
  { id: "customers", label: "Customers", hint: "Client accounts only", icon: Users },
  { id: "vendors", label: "Therapists", hint: "Vendor owners and staff", icon: Store },
  { id: "all", label: "Everyone", hint: "Customers and therapists", icon: Mail },
  { id: "individuals", label: "Individuals", hint: "Search and pick people", icon: UserRound }
];

const CHANNELS: { id: AnnouncementChannel; label: string; hint: string }[] = [
  { id: "email", label: "Email", hint: "Branded inbox only" },
  { id: "message", label: "In-app message", hint: "Dashboard notification only" },
  { id: "both", label: "Email and message", hint: "Inbox plus in-app alert" }
];

export function AnnouncementsConsole({ initial }: { initial: Payload }) {
  const [audience, setAudience] = useState<AnnouncementAudience>("customers");
  const [channel, setChannel] = useState<AnnouncementChannel>("both");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Open NaijaSpa");
  const [ctaHref, setCtaHref] = useState("/explore");
  const [images, setImages] = useState<AnnouncementImage[]>([]);
  const [links, setLinks] = useState<AnnouncementLink[]>([]);
  const [history, setHistory] = useState(initial.history);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);

  const count = audience === "individuals" ? picked.length : initial.counts[audience];
  const audienceLabel = AUDIENCES.find((item) => item.id === audience)?.label ?? audience;
  const linksReady = links.every(
    (link) => (!link.label.trim() && !link.href.trim()) || (link.label.trim() && link.href.trim())
  );
  const ready =
    subject.trim().length >= 4 &&
    title.trim().length >= 4 &&
    intro.trim().length >= 8 &&
    body.trim().length >= 12 &&
    linksReady &&
    (audience !== "individuals" || picked.length > 0);
  const previewTitle = title.trim() || "Announcement title";
  const previewIntro = intro.trim() || "A short opening line appears here.";
  const previewBody = body.trim() || "The rest of the update is shown in the branded NaijaSpa email.";
  const channelLabel = CHANNELS.find((item) => item.id === channel)?.label ?? channel;

  const impact = useMemo(
    () => [
      audience === "individuals"
        ? `Sends to ${picked.length} selected ${picked.length === 1 ? "person" : "people"}.`
        : `Sends to about ${count} ${audienceLabel.toLowerCase()} with alerts on.`,
      channel === "message"
        ? "In-app Messages screen only — no email."
        : channel === "email"
          ? "Email only — no in-app message."
          : "Email plus a full message in the recipient’s Messages screen.",
      images.length ? `${images.length} image${images.length === 1 ? "" : "s"} in the email.` : "No extra images attached.",
      "Deleted accounts are skipped. Email opt-outs skip inbox only."
    ],
    [audience, audienceLabel, channel, count, images.length, picked.length]
  );

  useEffect(() => {
    const q = peopleQuery.trim();
    if (audience !== "individuals" || q.length < 2) {
      setPeople([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/admin/announcements?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data: { people?: Person[] }) => setPeople(data.people ?? []))
        .catch(() => setPeople([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [audience, peopleQuery]);

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
          images,
          links,
          channel,
          userIds: audience === "individuals" ? picked.map((person) => person.id) : undefined
        })
      });
      setHistory((rows) => [result.result, ...rows].slice(0, 30));
      setMessage(
        result.result.queued
          ? `Sending to about ${result.result.attempted} people in the background. Check Recent sends in a minute — do not send the same blast again.`
          : `Sent ${result.result.sent} of ${result.result.attempted}. ${result.result.skipped} skipped, ${result.result.failed} failed.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {!initial.mailConfigured && channel !== "message" ? (
        <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          SMTP is not configured on this server. Emails will fail in production until SMTP_HOST is set. In-app messages still send.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-goldink">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="mt-3 font-display text-2xl">{item.id === "individuals" ? picked.length : initial.counts[item.id]}</p>
              <p className="text-[11px] text-ink2">{item.id === "individuals" ? "selected" : "active accounts"}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Compose"
          description="The email uses the NaijaSpa logo as a header. In-app messages use the same headline and opening line."
        >
          <div className="grid gap-3">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Send as</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {CHANNELS.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3 text-sm",
                      channel === item.id ? "border-gold bg-gold/10" : "border-line bg-card"
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="ann-channel"
                      checked={channel === item.id}
                      disabled={!initial.canEdit}
                      onChange={() => setChannel(item.id)}
                    />
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs text-ink2">{item.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {audience === "individuals" ? (
              <div className="rounded-2xl border border-line p-3">
                <FormRow label="Find people" htmlFor="ann-people" hint="Search by name or email. Up to 40 recipients.">
                  <input
                    id="ann-people"
                    className={adminField}
                    disabled={!initial.canEdit}
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder="Type a name or email"
                  />
                </FormRow>
                {searching ? <p className="mt-2 text-xs text-ink2">Searching…</p> : null}
                {people.length ? (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {people.map((person) => {
                      const selected = picked.some((row) => row.id === person.id);
                      return (
                        <li key={person.id}>
                          <button
                            type="button"
                            disabled={!initial.canEdit || (!selected && picked.length >= 40)}
                            onClick={() =>
                              setPicked((rows) =>
                                selected ? rows.filter((row) => row.id !== person.id) : [...rows, person]
                              )
                            }
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-elev",
                              selected && "bg-gold/10"
                            )}
                          >
                            <span>
                              <span className="block font-medium">{person.name || "No name"}</span>
                              <span className="block text-xs text-ink2">{person.email}</span>
                            </span>
                            <span className="text-[11px] uppercase text-ink2">{person.role.replace("_", " ")}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : peopleQuery.trim().length >= 2 && !searching ? (
                  <p className="mt-2 text-xs text-ink2">No matching customers or therapists.</p>
                ) : null}
                {picked.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {picked.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className="rounded-full border border-line bg-elev px-3 py-1 text-xs"
                        onClick={() => setPicked((rows) => rows.filter((row) => row.id !== person.id))}
                      >
                        {person.name || person.email} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <FormRow label="Email subject" htmlFor="ann-subject" hint="Shows in the inbox list. Also used as the in-app title if you leave the headline empty in history.">
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
            <AnnouncementMedia images={images} links={links} disabled={!initial.canEdit} onImages={setImages} onLinks={setLinks} />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormRow label="Main button label" htmlFor="ann-cta-label">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink2">
                About {count} {audience === "individuals" ? "selected people" : audienceLabel.toLowerCase()} · {channelLabel.toLowerCase()}.
              </p>
              <ConfirmAction
                triggerLabel={busy ? "Sending…" : "Review and send"}
                triggerIcon={channel === "message" ? MessageSquare : Send}
                triggerVariant="default"
                disabled={!initial.canEdit || busy || !ready}
                title={`Send to ${audienceLabel.toLowerCase()}?`}
                description={`This ${channel === "message" ? "messages" : "emails"} about ${count} ${audience === "individuals" ? "selected people" : `active ${audienceLabel.toLowerCase()}`}. You cannot unsend it.`}
                confirmLabel={channel === "message" ? "Send messages" : "Send"}
                impact={impact}
                onConfirm={() => send()}
              />
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-2" title="Preview" description="Header uses the NaijaSpa logo on forest green.">
          <div className="overflow-hidden rounded-2xl border border-gold/50 bg-[#064E3B] text-[#f4efe6]">
            <div className="border-b-[3px] border-[#D4AF37] bg-[#064E3B] px-6 py-8">
              <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className="mx-auto h-auto w-full max-w-[220px]" />
            </div>
            <div className="p-5">
              <h3 className="font-display text-2xl text-[#D4AF37]">{previewTitle}</h3>
              <p className="mt-3 text-sm leading-relaxed">{previewIntro}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed opacity-90">{previewBody}</p>
              {images.length ? (
                <div className="mt-4 grid gap-2">
                  {images.map((image, index) => (
                    <img key={`${image.src}-${index}`} src={image.src} alt="" className="max-h-36 w-full rounded-xl object-cover" />
                  ))}
                </div>
              ) : null}
              {ctaLabel.trim() && ctaHref.trim() ? (
                <p className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#064E3B]">{ctaLabel.trim()}</p>
              ) : null}
              {links.some((link) => link.label.trim() && link.href.trim()) ? (
                <ul className="mt-4 space-y-1 text-sm text-[#D4AF37] underline">
                  {links
                    .filter((link) => link.label.trim() && link.href.trim())
                    .map((link, index) => (
                      <li key={`${link.href}-${index}`}>{link.label.trim()}</li>
                    ))}
                </ul>
              ) : null}
            </div>
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
                  <th className="pb-2 font-medium">Send as</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Sent</th>
                  <th className="pb-2 font-medium">Attach</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2 text-ink2">
                      {new Date(row.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                    </td>
                    <td className="py-2 capitalize">{row.audience}</td>
                    <td className="py-2 capitalize">{row.channel ?? (row.inApp ? "both" : "email")}</td>
                    <td className="py-2">{row.subject}</td>
                    <td className="py-2">
                      {row.queued && !row.sent ? "Sending…" : `${row.sent}/${row.attempted}`}
                      {row.failed ? ` · ${row.failed} failed` : ""}
                    </td>
                    <td className="py-2 text-ink2">
                      {row.imageCount || 0} img · {row.linkCount || 0} link
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
