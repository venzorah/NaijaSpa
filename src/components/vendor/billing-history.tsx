"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, History, LoaderCircle, ReceiptText, Search, X } from "lucide-react";
import { formatNgn } from "@/lib/money";
import type { VendorBillingPage } from "@/lib/vendor-billing";
import { AdminStatusPill } from "@/components/admin/status-pill";

const date = (value: string) => new Date(value).toLocaleDateString("en-NG", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos"
});

export function BillingHistoryButton({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(initiallyOpen); }, [initiallyOpen]);
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-card px-3.5 text-xs font-semibold transition hover:border-gold/50 hover:bg-elev">
      <History className="h-4 w-4" aria-hidden /> Billing history
    </button>
    {open ? <BillingHistoryDialog onClose={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }} /> : null}
  </>;
}

function BillingHistoryDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId(), descriptionId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const [page, setPage] = useState(1), [query, setQuery] = useState("");
  const [result, setResult] = useState<VendorBillingPage | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const items = [...dialog.current!.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')].filter(item => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/vendor/subscriptions/billing?page=${page}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Billing history could not be loaded. Please try again.");
        const data: VendorBillingPage = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load billing history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, query, retry]);

  return createPortal(
    <div className="vendor-portal fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-goldink"><ReceiptText className="h-5 w-5" aria-hidden /></span><div><h2 id={titleId} className="font-semibold">Billing history</h2><p id={descriptionId} className="mt-1 text-xs text-ink2">Your listing subscription payments and billing periods.</p></div></div>
          <button type="button" onClick={onClose} aria-label="Close billing history" className="shrink-0 rounded-lg p-2 text-ink2 transition hover:bg-elev hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        <div className="shrink-0 border-b border-line px-5 py-4 sm:px-6"><label className="relative block max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink2" aria-hidden /><input aria-label="Search billing reference" value={query} maxLength={80} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search payment reference…" className="h-9 w-full rounded-lg border border-line bg-bg pl-9 pr-3 outline-none focus:border-gold" /></label></div>
        <div aria-busy={loading} className="relative min-h-0 flex-1 overflow-auto">
          {loading ? <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-ink2"><LoaderCircle className="h-5 w-5 animate-spin text-goldink" aria-hidden /> Loading billing history…</div>
            : error ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><p role="alert" className="text-sm text-ink2">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold hover:bg-elev">Try again</button></div>
              : result?.rows.length ? <table className="min-w-[700px]"><caption className="sr-only">Subscription payment history</caption><thead><tr><th>Payment</th><th>Plan</th><th>Period</th><th className="!text-right">Amount</th><th>Status</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.id} className="hover:bg-elev/40"><td><p className="max-w-64 truncate font-mono text-[11px]" title={row.reference}>{row.reference}</p><p className="mt-1 text-[11px] text-ink2">{date(row.createdAt)}</p></td><td className="font-semibold">{row.plan}</td><td className="whitespace-nowrap text-xs text-ink2">{date(row.startsAt)} – {date(row.endsAt)}</td><td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatNgn(row.amountKobo)}</td><td><AdminStatusPill status={row.status} /></td></tr>)}</tbody></table>
                : <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center"><ReceiptText className="mb-2 h-9 w-9 text-ink2/60" aria-hidden /><p className="font-semibold">{query ? "No matching payments" : "No billing history yet"}</p><p className="max-w-sm text-xs leading-relaxed text-ink2">{query ? "Try another payment reference or clear your search." : "Your subscription payments will appear here after they are recorded."}</p></div>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-bg2 px-5 py-4 sm:px-6"><p className="text-[11px] text-ink2">{!loading && !error && result ? `${result.total ? (result.page - 1) * result.pageSize + 1 : 0}–${Math.min(result.page * result.pageSize, result.total)} of ${result.total} payments` : "Subscription billing"}</p><div className="flex items-center gap-2"><button type="button" aria-label="Previous billing page" disabled={loading || !!error || !result || result.page <= 1} onClick={() => setPage(result!.page - 1)} className="rounded-lg border border-line p-2 hover:bg-elev disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs text-ink2">{result?.page ?? 1} / {result?.pages ?? 1}</span><button type="button" aria-label="Next billing page" disabled={loading || !!error || !result || result.page >= result.pages} onClick={() => setPage(result!.page + 1)} className="rounded-lg border border-line p-2 hover:bg-elev disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={onClose} className="ml-2 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-ongold hover:brightness-105">Done</button></div></footer>
      </div>
    </div>, document.body
  );
}
