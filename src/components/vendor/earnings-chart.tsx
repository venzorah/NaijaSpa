import { formatNgnCompact } from "@/lib/money";
export function EarningsChart({ days }: {
    days: {
        label: string;
        value: number;
    }[];
}) {
    const max = Math.max(100000, ...days.map(d => d.value));
    return <div role="img" aria-label={days.map(d => `${d.label}: ${formatNgnCompact(d.value)}`).join(', ')} className="relative h-64 pb-6 pl-12 pt-2"><div aria-hidden className="absolute inset-y-2 left-0 flex w-10 flex-col justify-between pb-6 text-right text-[10px] text-ink2">{[1, .75, .5, .25, 0].map(v => <span key={v}>{formatNgnCompact(Math.round(max * v))}</span>)}</div><div aria-hidden className="pointer-events-none absolute inset-y-2 left-12 right-0 flex flex-col justify-between pb-6">{[0, 1, 2, 3, 4].map(v => <div key={v} className="border-t border-line"/>)}</div><div className="relative flex h-full items-end justify-around gap-2">{days.map((d, i) => <div key={i} className="relative flex h-full min-w-0 flex-1 items-end justify-center"><div title={`${d.label}: ${formatNgnCompact(d.value)}`} className="w-full max-w-10 rounded-t bg-gold/80" style={{ height: d.value / max * 100 + '%' }}/><span className="absolute -bottom-6 text-[10px] text-ink2">{d.label}</span></div>)}</div></div>;
}
