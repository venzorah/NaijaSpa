"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-bg2 md:max-w-lg md:rounded-[28px]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink2 hover:bg-elev"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>,
    document.body
  );
}
