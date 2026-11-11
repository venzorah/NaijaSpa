"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { adminBtn, adminBtnGhost, adminBtnOutline } from "@/components/admin/form-row";
import { cn } from "@/lib/cn";

export function ConfirmAction({
  triggerLabel,
  triggerIcon: Icon,
  triggerVariant = "outline",
  triggerClassName,
  title,
  description,
  confirmLabel,
  impact,
  requireReason = false,
  disabled,
  onConfirm
}: {
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerClassName?: string;
  title: string;
  description: string;
  confirmLabel: string;
  impact?: string[];
  requireReason?: boolean;
  disabled?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const pending = useRef(busy); pending.current = busy;
  useEffect(() => {
    if(!open) return;
    const previous=document.activeElement as HTMLElement|null;
    const root=dialog.current;
    const controls=()=>[...root!.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,input')].filter(el=>el.getClientRects().length>0);
    (root?.querySelector<HTMLElement>('textarea') || controls()[0] || root)?.focus();
    const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();if(!pending.current)setOpen(false);}if(event.key==='Tab'){const all=controls(),first=all[0],last=all.at(-1);if(!first){event.preventDefault();root?.focus();}else if(event.shiftKey&&(document.activeElement===first||!root?.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!root?.contains(document.activeElement))){event.preventDefault();first.focus();}}};
    document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);previous?.focus();};
  },[open]);
  const blocked = requireReason && reason.trim().length < 5;
  const trigger =
    triggerVariant === "default" ? adminBtn : triggerVariant === "ghost" ? adminBtnGhost : adminBtnOutline;

  return (
    <>
      <button type="button" disabled={disabled} className={cn(trigger, triggerClassName)} onClick={() => setOpen(true)}>
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {triggerLabel}
      </button>
      {open ? createPortal(
        <div data-confirm-dialog="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={() => setOpen(false)} />
          <div ref={dialog} tabIndex={-1} className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-goldink">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </div>
            <h2 id="confirm-title" className="text-base font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink2">{description}</p>
            {impact?.length ? (
              <ul className="mt-3 space-y-1 rounded-lg border border-line bg-elev p-3 text-xs text-ink2">
                {impact.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
            {requireReason ? (
              <label className="mt-3 block text-xs font-medium">
                Reason <span className="text-ink2">(recorded in audit log)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-line bg-elev px-3 py-2 text-sm"
                  placeholder="Explain why this action is necessary…"
                />
              </label>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={adminBtnOutline} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={blocked || busy}
                className={adminBtn}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await onConfirm(reason);
                    setOpen(false);
                    setReason("");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "That action did not complete.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </>
  );
}
