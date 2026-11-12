"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { VERIFICATION_DOC_OPTIONS, type VerificationDocKind } from "@/lib/verification-doc-kinds";

export type OnboardingDoc = { id: string; kind: string; label: string; status: string; url: string };

const fieldClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60";

export function VendorOnboardingDocs({
  docs,
  disabled,
  onChange,
  onError
}: {
  docs: OnboardingDoc[];
  disabled?: boolean;
  onChange: (next: OnboardingDoc[]) => void;
  onError: (message: string) => void;
}) {
  const [busyKind, setBusyKind] = useState<VerificationDocKind | "">("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(kind: VerificationDocKind, file: File | undefined) {
    if (!file || disabled) return;
    setBusyKind(kind);
    onError("");
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/vendor/documents", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string; document?: OnboardingDoc };
      if (!res.ok || !json.document) throw new Error(json.error || "Could not upload that image.");
      onChange([...docs.filter((doc) => doc.kind !== kind), json.document]);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not upload that image.");
    } finally {
      setBusyKind("");
      const input = inputs.current[kind];
      if (input) input.value = "";
    }
  }

  async function remove(doc: OnboardingDoc) {
    if (disabled) return;
    setBusyKind(doc.kind as VerificationDocKind);
    onError("");
    try {
      const res = await fetch(`/api/vendor/documents/${doc.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not remove that document.");
      onChange(docs.filter((item) => item.id !== doc.id));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not remove that document.");
    } finally {
      setBusyKind("");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">
        Upload a clear photo of <span className="font-semibold text-goldink">one</span> of these: a government ID, your
        CAC / business registration, or a practice licence. One is enough for review. You can add the others if you have
        them.
      </p>
      {VERIFICATION_DOC_OPTIONS.map((option) => {
        const current = docs.find((doc) => doc.kind === option.id);
        const busy = busyKind === option.id;
        return (
          <div key={option.id} className="rounded-[1.5rem] border border-line bg-elev p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl">{option.label}</p>
                <p className="mt-1 text-sm text-ink2">{option.hint}</p>
              </div>
              {current ? (
                <span className="rounded-full bg-gold/15 px-2 py-1 text-[11px] font-semibold text-goldink">Attached</span>
              ) : (
                <span className="rounded-full border border-line px-2 py-1 text-[11px] text-ink2">
                  {docs.length ? "Optional extra" : "Any one of these"}
                </span>
              )}
            </div>
            <input
              ref={(el) => {
                inputs.current[option.id] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-label={`Upload ${option.label}`}
              disabled={disabled || Boolean(busyKind)}
              onChange={(event) => void upload(option.id, event.target.files?.[0])}
            />
            {current ? (
              <div className="mt-3 space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.url} alt="" className="max-h-40 w-full rounded-2xl object-cover" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={fieldClass} disabled={disabled || busy} onClick={() => inputs.current[option.id]?.click()}>
                    <ImagePlus className="h-4 w-4" />
                    {busy ? "Uploading…" : "Replace photo"}
                  </button>
                  <button type="button" className={fieldClass} disabled={disabled || busy} onClick={() => void remove(current)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={`${fieldClass} mt-3`}
                disabled={disabled || Boolean(busyKind)}
                onClick={() => inputs.current[option.id]?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                {busy ? "Uploading…" : "Upload photo"}
              </button>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink2">JPEG, PNG, WebP or GIF · up to 2 MB. These stay private for admin review.</p>
    </div>
  );
}
