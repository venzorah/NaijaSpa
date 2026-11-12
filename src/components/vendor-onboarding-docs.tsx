"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { VERIFICATION_DOC_OPTIONS, type VerificationDocKind } from "@/lib/verification-doc-kinds";
import { cn } from "@/lib/cn";

export type OnboardingDoc = { id: string; kind: string; label: string; status: string; url: string };

const uploadHint: Record<VerificationDocKind, string> = {
  id: "Upload ID",
  business_registration: "Upload registration certificate",
  license: "Upload licence"
};

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
  const [overKind, setOverKind] = useState<VerificationDocKind | "">("");
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
      setOverKind("");
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
        Upload a clear photo of <span className="font-semibold text-goldink">one</span> of these. One is enough for
        review. You can add the others if you have them.
      </p>
      {VERIFICATION_DOC_OPTIONS.map((option) => {
        const current = docs.find((doc) => doc.kind === option.id);
        const busy = busyKind === option.id;
        const dragging = overKind === option.id;
        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-goldink">{option.label}</p>
                <p className="mt-1 text-sm text-ink2">{option.hint}</p>
              </div>
              {current ? (
                <span className="rounded-full bg-gold/15 px-2 py-1 text-[11px] font-semibold text-goldink">Uploaded</span>
              ) : (
                <span className="rounded-full border border-line px-2 py-1 text-[11px] text-ink2">
                  {docs.length ? "Optional extra" : "Upload one"}
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
              aria-label={uploadHint[option.id]}
              disabled={disabled || Boolean(busyKind)}
              onChange={(event) => void upload(option.id, event.target.files?.[0])}
            />
            {current ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-line bg-elev">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.url} alt="" className="max-h-44 w-full object-cover" />
                <div className="flex flex-wrap gap-2 p-3">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60"
                    disabled={disabled || busy}
                    onClick={() => inputs.current[option.id]?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {busy ? "Uploading…" : "Replace photo"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60"
                    disabled={disabled || busy}
                    onClick={() => void remove(current)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={disabled || Boolean(busyKind)}
                onClick={() => inputs.current[option.id]?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverKind(option.id);
                }}
                onDragLeave={() => setOverKind("")}
                onDrop={(event) => {
                  event.preventDefault();
                  setOverKind("");
                  void upload(option.id, event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed px-4 py-8 text-center transition disabled:opacity-60",
                  dragging ? "border-gold bg-gold/10" : "border-gold/50 bg-elev hover:border-gold hover:bg-gold/5"
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-goldink">
                  <Upload className="h-6 w-6" aria-hidden />
                </span>
                <span className="font-display text-2xl text-goldink">{busy ? "Uploading…" : uploadHint[option.id]}</span>
                <span className="text-sm text-ink2">Tap to choose a photo, or drop an image here</span>
                <span className="text-xs text-ink2">JPEG, PNG, WebP or GIF · up to 2 MB</span>
              </button>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink2">These photos stay private for admin review. They are not shown on Explore.</p>
    </div>
  );
}
