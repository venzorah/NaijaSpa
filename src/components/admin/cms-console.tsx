"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save } from "lucide-react";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";

type Tab = "pages" | "faqs" | "hero";

export function CmsConsole({
  blocks,
  faqs,
  editable
}: {
  blocks: { id: string; key: string; title: string; body: string; published: boolean }[];
  faqs: { id: string; question: string; answer: string; published: boolean }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pages");
  const [selectedId, setSelectedId] = useState(blocks[0]?.id ?? "");
  const selected = blocks.find((b) => b.id === selectedId);
  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-elev p-1">
        {(
          [
            ["pages", "Pages & legal"],
            ["hero", "Hero & ads"],
            ["faqs", "FAQs"]
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === id ? "bg-card ring-1 ring-gold/30" : "text-ink2")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "hero" ? (
        <Panel title="Homepage hero & premium ads" description="Banner copy, image and rotating vendor ads.">
          <p className="text-sm text-ink2">Edit the live homepage banner and carousel ads in the dedicated editor.</p>
          <Link href="/admin/hero" className={`${adminBtn} mt-4 inline-flex`}>
            Open hero & ads editor
          </Link>
        </Panel>
      ) : null}
      {tab === "pages" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Panel title="Content blocks" className="xl:col-span-2" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn("flex w-full items-center justify-between px-4 py-3 text-left text-sm", selectedId === b.id && "bg-gold/5")}
                  >
                    <span>
                      <span className="block font-medium">{b.title}</span>
                      <span className="font-mono text-[11px] text-ink2">{b.key}</span>
                    </span>
                    <AdminStatusPill status={b.published ? "published" : "draft"} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={selected ? selected.title : "Edit"} className="xl:col-span-3">
            {selected ? (
              <form
                key={selected.id}
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await adminJson("/api/admin/cms", {
                    method: "PATCH",
                    body: JSON.stringify({
                      id: selected.id,
                      title: String(fd.get("title") || ""),
                      body: String(fd.get("body") || ""),
                      published: fd.get("published") === "on"
                    })
                  });
                  router.refresh();
                }}
              >
                <FormRow label="Title" htmlFor="cms-title">
                  <input id="cms-title" name="title" defaultValue={selected.title} disabled={!editable} className={adminField} />
                </FormRow>
                <FormRow label="Body" htmlFor="cms-body">
                  <textarea id="cms-body" name="body" rows={10} defaultValue={selected.body} disabled={!editable} className={adminField} />
                </FormRow>
                <label className="flex items-center gap-2 text-sm">
                  <input name="published" type="checkbox" defaultChecked={selected.published} disabled={!editable} /> Published
                </label>
                <button className={adminBtn} disabled={!editable}>
                  <Save className="h-3.5 w-3.5" aria-hidden /> Save
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink2">No CMS blocks yet. Seed content or add rows in the database.</p>
            )}
          </Panel>
        </div>
      ) : null}
      {tab === "faqs" ? (
        <div className="space-y-4">
          <Panel title="Add FAQ">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                await adminJson("/api/admin/faqs", {
                  method: "POST",
                  body: JSON.stringify({ question: fd.get("question"), answer: fd.get("answer") })
                });
                form.reset();
                router.refresh();
              }}
            >
              <FormRow label="Question" htmlFor="faq-q">
                <input id="faq-q" name="question" required disabled={!editable} className={adminField} />
              </FormRow>
              <FormRow label="Answer" htmlFor="faq-a">
                <textarea id="faq-a" name="answer" required rows={2} disabled={!editable} className={adminField} />
              </FormRow>
              <button className={adminBtn} disabled={!editable}>
                Add FAQ
              </button>
            </form>
          </Panel>
          <Panel title="Published questions" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {faqs.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{f.question}</p>
                    <p className="text-xs text-ink2">{f.answer}</p>
                  </div>
                  <button
                    type="button"
                    className={adminBtnOutline}
                    disabled={!editable}
                    onClick={async () => {
                      await adminJson(`/api/admin/faqs/${f.id}`, { method: "PATCH", body: JSON.stringify({ published: !f.published }) });
                      router.refresh();
                    }}
                  >
                    {f.published ? "Unpublish" : "Publish"}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
