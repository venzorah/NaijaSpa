"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { lagosDateKey } from "@/lib/vendor-calendar";
type Event = {
    id: string;
    startsAt: string;
    endsAt: string;
    title: string;
    subtitle: string;
    status: string;
    blocked?: boolean;
};
export function VendorCalendar({ start, events }: {
    start: string;
    events: Event[];
}) {
    const router = useRouter(), [view, setView] = useState<'week' | 'month'>('week');
    const from = new Date(start);
    const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * 86400000));
    const nav = (offset: number) => router.push('/vendor/availability?week=' + lagosDateKey(new Date(from.getTime() + offset * 7 * 86400000)), { scroll: false });
    return <section className="mb-5 overflow-hidden rounded-xl border border-line bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4"><div className="flex items-center gap-3"><button aria-label="Previous week" onClick={() => nav(-1)} className="rounded p-1 hover:bg-elev"><ChevronLeft className="h-4 w-4"/></button><p className="text-xs font-semibold">{days[0].toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })} – {days[6].toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })}</p><button aria-label="Next week" onClick={() => nav(1)} className="rounded p-1 hover:bg-elev"><ChevronRight className="h-4 w-4"/></button></div><div className="flex items-center gap-1 rounded-lg bg-elev p-1"><button className="vendor-tab" onClick={() => router.push('/vendor/availability', { scroll: false })}>Today</button>{(['week', 'month'] as const).map(v => <button key={v} className="vendor-tab capitalize" aria-selected={view === v} onClick={() => setView(v)}>{v}</button>)}</div></div>{view === 'week' ? <div className="overflow-x-auto"><div className="grid min-w-[780px] grid-cols-7">{days.map(day => { const key = lagosDateKey(day); const dayEvents = events.filter(e => new Date(e.startsAt) < new Date(day.getTime() + 86400000) && new Date(e.endsAt) > day); return <div key={key} className="min-h-[340px] border-r border-line last:border-r-0"><div className={`border-b border-line p-3 text-center ${key === lagosDateKey(new Date()) ? 'bg-gold/10' : ''}`}><p className="text-[10px] uppercase text-ink2">{day.toLocaleDateString('en-NG', { weekday: 'short', timeZone: 'Africa/Lagos' })}</p><p className="mt-1 text-lg font-semibold">{new Date(day.getTime() + 3600000).getUTCDate()}</p></div><div className="space-y-2 p-2">{dayEvents.length ? dayEvents.map(e => <Link href={e.blocked ? '#blocked-time' : '/vendor/bookings?q=' + encodeURIComponent(e.title)} key={e.id} className={`block rounded-md border-l-2 p-2 text-[10px] ${e.blocked ? 'border-ink2 bg-elev' : ['pending', 'awaiting_payment'].includes(e.status) ? 'border-gold bg-gold/10' : 'border-leaf bg-forest/10'}`}><p className="font-mono text-ink2">{new Date(e.startsAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}</p><p className="my-1 font-semibold">{e.title}</p><p className="text-ink2">{e.subtitle}</p></Link>) : <p className="py-12 text-center text-[10px] text-ink2">No appointments</p>}</div></div>; })}</div></div> : <MonthView date={from} events={events}/>}<div className="flex flex-wrap gap-4 border-t border-line px-4 py-3 text-[10px] text-ink2"><span><span className="mr-1 text-leaf">●</span>Confirmed / completed</span><span><span className="mr-1 text-goldink">●</span>Pending / tentative</span><span>● Blocked</span><span>All times WAT</span></div></section>;
}
function MonthView({ date, events }: {
    date: Date;
    events: Event[];
}) { const local = new Date(date.getTime() + 3600000), first = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 3600000); const weekday = new Date(first.getTime() + 3600000).getUTCDay(); const gridStart = new Date(first.getTime() - ((weekday + 6) % 7) * 86400000); return <div><p className="px-4 pt-4 text-xs text-ink2">{local.toLocaleDateString('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' })} · select a day to open its week</p><div className="grid grid-cols-7 p-3">{Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart.getTime() + i * 86400000), key = lagosDateKey(d), count = events.filter(e => lagosDateKey(new Date(e.startsAt)) === key).length; return <Link key={key} href={'/vendor/availability?week=' + key} className="min-h-16 border border-line p-2 text-xs hover:bg-elev"><span>{new Date(d.getTime() + 3600000).getUTCDate()}</span>{count ? <p className="mt-1 text-[9px] text-goldink">{count} event{count === 1 ? '' : 's'}</p> : null}</Link>; })}</div></div>; }
