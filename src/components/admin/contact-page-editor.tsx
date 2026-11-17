"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import {
  CONTACT_CHANNEL_KINDS,
  parseContactPage,
  serializeContactPage,
  type ContactChannel,
  type ContactChannelKind
} from "@/lib/contact-page";

type Block = {
  id: string;
  key: string;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
};

const KIND_LABEL: Record<ContactChannelKind, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  phone: "Phone",
  address: "Office / address",
  hours: "Hours",
  link: "Link",
  text: "Text only"
};

function emptyChannel(): ContactChannel {
  return { kind: "text", label: "", value: "" };
}

export function ContactPageEditor({ block, editable }: { block: Block; editable: boolean }) {
  const router = useRouter();
  const initial = useMemo(() => parseContactPage(block.body), [block.body]);
  const [title, setTitle] = useState(block.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [intro, setIntro] = useState(initial.intro);
  const [formHeading, setFormHeading] = useState(initial.formHeading);
  const [showForm, setShowForm] = useState(initial.showForm);
  const [channels, setChannels] = useState<ContactChannel[]>(initial.channels);
  const [metaTitle, setMetaTitle] = useState(block.metaTitle);
  const [metaDescription, setMetaDescription] = useState(block.metaDescription);
  const [published, setPublished] = useState(block.published);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function updateChannel(index: number, patch: Partial<ContactChannel>) {
    setChannels((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        try {
          await adminJson("/api/admin/cms", {
            method: "PATCH",
            body: JSON.stringify({
              id: block.id,
              title,
              body: serializeContactPage({
                subtitle,
                intro,
                showForm,
                formHeading,
                channels: channels.filter((row) => row.label.trim() || row.value.trim())
              }),
              metaTitle,
              metaDescription,
              published
            })
          });
          setMsg("Contact page saved. Refresh /contact to see it live.");
          router.refresh();
        } catch (error) {
          setMsg(error instanceof Error ? error.message : "Could not save the contact page.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-ink2">
        This is the full public page at{" "}
        <Link href="/contact" className="font-semibold underline" target="_blank" rel="noreferrer">
          /contact
        </Link>
        . Change the heading, intro, every contact line, and whether the message form is shown.
      </p>
      <FormRow label="Page title" htmlFor="contact-title">
        <input id="contact-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} className={adminField} />
      </FormRow>
      <FormRow label="Subtitle" htmlFor="contact-subtitle" hint="Shown under the title.">
        <input id="contact-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={!editable} className={adminField} />
      </FormRow>
      <FormRow label="Intro" htmlFor="contact-intro" hint="Optional paragraph above the contact list.">
        <textarea id="contact-intro" rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} disabled={!editable} className={adminField} />
      </FormRow>
      <div className="space-y-2">
        <p className="text-xs font-medium">Contact lines</p>
        {channels.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-line bg-elev p-3 sm:grid-cols-2">
            <FormRow label="Type" htmlFor={`contact-kind-${index}`}>
              <select
                id={`contact-kind-${index}`}
                className={adminField}
                value={row.kind}
                disabled={!editable}
                onChange={(e) => updateChannel(index, { kind: e.target.value as ContactChannelKind })}
              >
                {CONTACT_CHANNEL_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Label" htmlFor={`contact-label-${index}`}>
              <input
                id={`contact-label-${index}`}
                className={adminField}
                value={row.label}
                disabled={!editable}
                onChange={(e) => updateChannel(index, { label: e.target.value })}
              />
            </FormRow>
            <FormRow label="Value" htmlFor={`contact-value-${index}`}>
              <input
                id={`contact-value-${index}`}
                className={adminField}
                value={row.value}
                disabled={!editable}
                onChange={(e) => updateChannel(index, { value: e.target.value })}
              />
            </FormRow>
            <FormRow label="Link (optional)" htmlFor={`contact-href-${index}`} hint="Leave blank to auto-link email, phone and WhatsApp.">
              <input
                id={`contact-href-${index}`}
                className={adminField}
                value={row.href || ""}
                disabled={!editable}
                placeholder="https://…"
                onChange={(e) => updateChannel(index, { href: e.target.value })}
              />
            </FormRow>
            <div className="sm:col-span-2">
              <button
                type="button"
                className={adminBtnOutline}
                disabled={!editable}
                onClick={() => setChannels((rows) => rows.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove line
              </button>
            </div>
          </div>
        ))}
        <button type="button" className={adminBtnOutline} disabled={!editable} onClick={() => setChannels((rows) => [...rows, emptyChannel()])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add contact line
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showForm} disabled={!editable} onChange={(e) => setShowForm(e.target.checked)} />
        Show the message form
      </label>
      {showForm ? (
        <FormRow label="Form heading" htmlFor="contact-form-heading">
          <input
            id="contact-form-heading"
            value={formHeading}
            onChange={(e) => setFormHeading(e.target.value)}
            disabled={!editable}
            className={adminField}
          />
        </FormRow>
      ) : null}
      <FormRow label="Meta title" htmlFor="contact-meta-title">
        <input id="contact-meta-title" maxLength={80} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} disabled={!editable} className={adminField} />
      </FormRow>
      <FormRow label="Meta description" htmlFor="contact-meta-desc">
        <textarea
          id="contact-meta-desc"
          maxLength={320}
          rows={3}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          disabled={!editable}
          className={adminField}
        />
      </FormRow>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} disabled={!editable} onChange={(e) => setPublished(e.target.checked)} /> Published
      </label>
      {msg ? <p className="text-sm text-ink2">{msg}</p> : null}
      <button className={adminBtn} disabled={!editable || busy}>
        <Save className="h-3.5 w-3.5" aria-hidden /> {busy ? "Saving…" : "Save contact page"}
      </button>
    </form>
  );
}
