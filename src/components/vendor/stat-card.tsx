import Link from "next/link";
import type { LucideIcon } from "lucide-react";
export function StatCard({ label, value, sub, icon: Icon, emphasis, href, progress }: {
    label: string;
    value: string;
    sub?: string;
    icon?: LucideIcon;
    emphasis?: "gold" | "none";
    href?: string;
    progress?: number;
}) {
    const body = <div className={`vendor-stat h-full rounded-xl border bg-card ${emphasis === 'gold' ? 'border-gold/30' : 'border-line'}`}><div className="flex items-start justify-between gap-2"><p className="text-xs text-ink2">{label}</p>{Icon ? <span className={`vendor-stat-icon ${emphasis === 'gold' ? '!bg-gold/10 !text-goldink' : ''}`}><Icon className="h-4 w-4"/></span> : null}</div><p className="vendor-stat-value mt-1 font-semibold tabular-nums">{value}</p>{sub ? <p className="mt-1 text-[11px] text-ink2">{sub}</p> : null}{progress !== undefined ? <div role="meter" aria-label={label} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-1 overflow-hidden rounded bg-elev"><div className="h-full bg-gold" style={{ width: Math.max(0, Math.min(100, progress)) + '%' }}/></div> : null}</div>;
    return href ? <Link href={href} className="block rounded-xl transition hover:ring-1 hover:ring-gold/50">{body}</Link> : body;
}
