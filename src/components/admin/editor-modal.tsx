"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function EditorModal({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: React.ReactNode }) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const pending = useRef(busy); pending.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const root = dialog.current;
    const focusable = () => [...root!.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    (root?.querySelector<HTMLElement>('[data-initial-focus]:not([disabled])') ?? focusable()[0] ?? root)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if(document.querySelector('[data-confirm-dialog="true"]')) return;
      if (event.key === "Escape" && !pending.current) { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const list = focusable(); const first = list[0], last = list.at(-1);
        if (!first) { event.preventDefault(); root?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !root?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !root?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><h2 id={id} className="font-display text-xl font-semibold">{title}</h2><button type="button" aria-label="Close editor" disabled={busy} onClick={onClose} className="rounded-full p-2 hover:bg-elev"><X className="h-5 w-5" /></button></div>
      <div className="overflow-y-auto p-5">{children}</div>
    </div>
  </div>, document.body);
}
