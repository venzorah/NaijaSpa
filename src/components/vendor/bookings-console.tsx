"use client";
import { useToast, useToastMessage } from "@/components/vendor/toasts";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarX, Download, Home, Hotel, Search } from "lucide-react";
import { VendorPageHeader } from "./page-header";
import { FilterChips } from "@/components/admin/filter-chips";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { EditorModal } from "@/components/admin/editor-modal";
import { adminBtn, adminBtnOutline } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { EmptyState } from "@/components/empty-state";
import { BookingChat } from "@/components/booking-chat";
type Filter = 'all' | 'action' | 'upcoming' | 'past' | 'cancelled';
const ACTION = ['pending', 'awaiting_payment', 'cancellation_requested'], UPCOMING = ['confirmed', 'in_progress'], PAST = ['completed', 'no_show'], CANCELLED = ['cancelled', 'refunded', 'refund_pending'];
type BookingRow = {
    id: string;
    ref: string;
    customer: string;
    customerKind?: string;
    phone?: string;
    email?: string;
    notes?: string;
    service: string;
    when: string;
    time: string;
    location: string;
    staff: string;
    payable: number;
    totalLabel: string;
    status: string;
    payment: string;
};
function csvCell(value: string) { return '"' + (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"'; }
export function VendorBookingsConsole({ rows, initialQuery }: {
    rows: BookingRow[];
    initialQuery: string;
}) {
    const router = useRouter();
    const toast = useToast();
    const [view, setView] = useState<Filter>('all'), [query, setQuery] = useState(initialQuery), [status, setStatusFilter] = useState('all'), [selectedId, setSelectedId] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useToastMessage();
    useEffect(() => setQuery(initialQuery), [initialQuery]);
    const filtered = useMemo(() => rows.filter(b => { const match = view === 'all' || (view === 'action' ? ACTION : view === 'upcoming' ? UPCOMING : view === 'past' ? PAST : CANCELLED).includes(b.status); return match && (status === 'all' || b.status === status) && (!query.trim() || [b.customer, b.service, b.ref, b.staff, b.phone, b.email, b.customerKind].some(v => (v || '').toLowerCase().includes(query.trim().toLowerCase()))); }), [rows, view, status, query]);
    const selected = rows.find(b => b.id === selectedId);
    async function update(next: string) { if (!selected || busy)
        return; setBusy(true); setError(''); try {
        await adminJson(`/api/vendor/bookings/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
        toast.success("Booking updated.");
        router.refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update booking.');
    }
    finally {
        setBusy(false);
    } }
    function download() { try {  const contents = '\uFEFF' + [['Reference', 'Customer', 'Service', 'When (WAT)', 'Location', 'Therapist', 'Vendor payable', 'Status'], ...filtered.map(b => [b.ref, b.customer, b.service, b.when, b.location, b.staff, b.totalLabel, b.status])].map(r => r.map(csvCell).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = 'naijaspa-bookings.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);  toast.success("Bookings export ready."); } catch { toast.error("Could not prepare the bookings export."); } }
    return <div><VendorPageHeader title="Bookings" description="Every request, confirmation and refund in one inbox." actions={<button className={adminBtnOutline} onClick={download} disabled={!filtered.length}><Download className="h-4 w-4"/>Export CSV</button>}/><div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row"><FilterChips label="Booking views" value={view} onChange={v => { setView(v); setStatusFilter('all'); }} options={[{ value: 'all', label: 'All' }, { value: 'action', label: 'Needs action' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'cancelled', label: 'Cancellations & refunds' }]}/><label className="relative block xl:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink2"/><input aria-label="Search bookings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customer, service, ref…" className="h-9 w-full rounded-lg border border-line bg-bg pl-9 pr-3"/></label></div><div role="group" aria-label="Booking status" className="mb-5 flex flex-wrap gap-2">{Array.from(new Set(rows.map(b => b.status))).map(s => <button key={s} aria-pressed={status === s} onClick={() => setStatusFilter(status === s ? 'all' : s)} className={`rounded-full border px-3 py-1.5 text-[10px] capitalize ${status === s ? 'border-gold bg-gold/10 text-goldink' : 'border-line text-ink2'}`}>{s.replaceAll('_', ' ')} <span className="ml-1 rounded-full bg-elev px-1.5">{rows.filter(b => b.status === s).length}</span></button>)}</div><Panel bodyClassName="p-0">{!filtered.length ? <EmptyState icon={CalendarX} title="No bookings match" text="Try a different status or clear your search."/> : <div className="overflow-x-auto"><table><thead><tr><th>Customer & service</th><th>When (WAT)</th><th>Location</th><th>Therapist</th><th>Payable</th><th>Status</th></tr></thead><tbody>{filtered.map(b => { const Icon = b.location === 'home' ? Home : b.location === 'hotel' ? Hotel : Building2; return <tr key={b.id} className="hover:bg-elev/60"><td><button onClick={() => { setSelectedId(b.id); setError(''); }} className="text-left"><span className="block font-semibold hover:text-goldink">{b.customer}</span><span className="block text-[11px] text-ink2">{b.customerKind === 'guest' ? 'Guest' : 'Registered'} · {b.service} · {b.ref}</span></button></td><td className="whitespace-nowrap text-xs">{b.when}</td><td><span className="flex items-center gap-2 whitespace-nowrap text-xs capitalize text-ink2"><Icon className="h-4 w-4"/>{b.location === 'spa' ? 'Spa / Office' : b.location}</span></td><td className="text-xs text-ink2">{b.staff}</td><td className="whitespace-nowrap font-semibold">{b.totalLabel}</td><td><button aria-label={`Open booking ${b.ref}`} onClick={() => { setSelectedId(b.id); setError(''); }}><AdminStatusPill status={b.status}/></button></td></tr>; })}</tbody></table></div>}</Panel><p className="mt-3 text-xs text-ink2">Showing {filtered.length} of {rows.length} recent bookings.</p>{selected ? <EditorModal title={selected.customer} busy={busy} onClose={() => setSelectedId(null)}><p className="mb-4 text-sm text-ink2">{selected.service} · {selected.ref}</p><AdminStatusPill status={selected.status}/><dl className="my-5 grid grid-cols-2 gap-4 text-sm">{[['When (WAT)', selected.when], ['Location', selected.location], ['Therapist', selected.staff], ['Customer type', selected.customerKind === 'guest' ? 'Guest Customer' : 'Registered Customer'], ['Phone', selected.phone || '—'], ['Email', selected.email || '—'], ['Instructions', selected.notes || '—'], ['Your payable', selected.totalLabel], ['Payment', selected.payment]].map(([k, v]) => <div key={k}><dt className="mb-1 text-xs text-ink2">{k}</dt><dd className="capitalize">{v}</dd></div>)}</dl>{error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}{selected.payment === "success" ? <div className="mb-4"><a href={`/vendor/chats/${selected.id}`} className="mb-2 inline-block text-sm font-semibold text-leaf hover:underline">Open full chat</a><BookingChat bookingId={selected.id} apiPath={`/api/vendor/bookings/${selected.id}/messages`} /></div> : <p className="mb-4 text-sm text-ink2">In-app chat and customer WhatsApp open after Paystack confirms payment.</p>}<div className="flex flex-wrap gap-2 border-t border-line pt-4"><button className={adminBtn} disabled={busy || selected.payment !== 'success' || !['pending', 'awaiting_payment'].includes(selected.status)} onClick={() => void update('confirmed')}>Confirm</button><button className={adminBtnOutline} disabled={busy || selected.status !== 'confirmed'} onClick={() => void update('in_progress')}>Start visit</button><button className={adminBtnOutline} disabled={busy || !UPCOMING.includes(selected.status)} onClick={() => void update('completed')}>Complete</button><button className={adminBtnOutline} disabled={busy || !UPCOMING.includes(selected.status)} onClick={() => void update('no_show')}>No-show</button></div></EditorModal> : null}</div>;
}
