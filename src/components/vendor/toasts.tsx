"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createToastFeedback, type ToastKind } from "@/lib/toast-feedback";
import "./toasts.css";
import { ACTION_FEEDBACK_EVENT } from "@/lib/action-feedback";
const ToastContext = createContext(createToastFeedback(() => {}));
type Notice = { id: number; kind: ToastKind; message: string; at: number };
export function VendorToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Notice[]>([]), [mounted, setMounted] = useState(false);
  const next = useRef(0), lastError = useRef(0);
  const dismiss = useCallback((id: number) => setItems(items => items.filter(item => item.id !== id)), []);
  const push = useCallback((kind: ToastKind, raw: string) => {
    const message = raw?.trim().slice(0, 500); if (!message) return;
    const at = Date.now(); if (kind === "error") lastError.current = at;
    const id = ++next.current;
    setItems(items => {
      const same = items.find(item => item.message === message && item.kind === kind && at - item.at < 1500);
      return [...items.filter(item => item.id !== same?.id), { id: same?.id ?? id, kind, message, at }].slice(-3);
    });
  }, []);
  const toast = useMemo(() => createToastFeedback(push), [push]);
  useEffect(() => {
    const feedback = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail && ["success", "error", "info"].includes(detail.kind) && typeof detail.message === "string") push(detail.kind, detail.message); };
    window.addEventListener(ACTION_FEEDBACK_EVENT, feedback);
    return () => window.removeEventListener(ACTION_FEEDBACK_EVENT, feedback);
  }, [push]);
  useEffect(() => {
    setMounted(true);
    let pending: ReturnType<typeof setTimeout>;
    const invalid = () => { clearTimeout(pending); pending = setTimeout(() => { if (Date.now() - lastError.current > 150) toast.error("Please complete the required fields and correct any highlighted values."); }, 0); };
    document.addEventListener("invalid", invalid, true);
    return () => { clearTimeout(pending); document.removeEventListener("invalid", invalid, true); };
  }, [toast]);
  return <ToastContext.Provider value={toast}>{children}{mounted ? createPortal(
    <ol aria-label="Action notifications" className="vendor-toast-stack pointer-events-none fixed right-4 left-4 z-[120] flex flex-col gap-3 sm:left-auto sm:w-96">
      {items.map(item => <ToastCard key={item.id} item={item} onDismiss={dismiss} />)}
    </ol>, document.body) : null}</ToastContext.Provider>;
}
function ToastCard({ item, onDismiss }: { item: Notice; onDismiss: (id: number) => void }) {
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [visible, setVisible] = useState(true);
  const remaining = useRef(0);
  useEffect(() => { remaining.current = item.kind === "error" ? 9000 : 5500; }, [item.at, item.kind]);
  useEffect(() => { const changed = () => setVisible(!document.hidden); changed(); document.addEventListener("visibilitychange", changed); return () => document.removeEventListener("visibilitychange", changed); }, []);
  useEffect(() => {
    if (hovered || focused || !visible) return;
    const started = Date.now(); const timer = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [item.id, item.at, hovered, focused, visible, onDismiss]);
  const Icon = item.kind === "success" ? CheckCircle2 : item.kind === "error" ? CircleAlert : Info;
  const title = item.kind === "success" ? "Success" : item.kind === "error" ? "Action unsuccessful" : "Update";
  return <li className="vendor-toast pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-xl" data-kind={item.kind} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <span className="vendor-toast-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icon className="h-5 w-5" aria-hidden /></span>
    <div className="min-w-0 flex-1" role={item.kind === "error" ? "alert" : "status"} aria-atomic="true"><p className="vendor-toast-brand text-[9px] font-bold uppercase tracking-[0.15em]">NaijaSpa</p><p className="mt-0.5 text-sm font-semibold text-ink">{title}</p><p className="mt-1 break-words text-xs leading-relaxed text-ink2">{item.message}</p></div>
    <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)} className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink2 hover:bg-elev focus-visible:outline-2 focus-visible:outline-gold"><X className="h-4 w-4" aria-hidden /></button>
  </li>;
}
export function useToast() { return useContext(ToastContext); }
export function useToastMessage(initial = "") {
  const [message, setMessage] = useState(initial), [kind, setKind] = useState<ToastKind>("error"); const toast = useToast();
  const notify = useCallback((message: string, kind: ToastKind = "error") => { setMessage(message); setKind(kind); if (message) toast[kind](message); }, [toast]);
  return [message, notify, kind] as const;
}
export function ToastOnMount({ kind, message }: { kind: ToastKind; message: string }) {
  const toast = useToast(); useEffect(() => { toast[kind](message); }, [toast, kind, message]); return null;
}
