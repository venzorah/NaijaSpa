"use client";


import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Crown, LoaderCircle, Menu, Moon, Search, ShieldCheck, Sun, X } from "lucide-react";
import { VENDOR_NAV } from "@/components/portal-chrome";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { useTheme } from "@/components/theme-provider";
import "./vendor-portal.css";
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'NS'; }
function PendingIcon({ icon: Icon }: {
    icon: typeof Search;
}) { const { pending } = useLinkStatus(); return pending ? <LoaderCircle aria-label="Opening page" className="h-4 w-4 shrink-0 animate-spin"/> : <Icon className="h-4 w-4 shrink-0" aria-hidden/>; }
export function VendorPortal({ children, userName, businessName, subtitle, logoUrl, planPaid, planLabel, commissionBps, bookingBadge, alerts }: {
    children: React.ReactNode;
    userName: string;
    businessName: string;
    subtitle: string;
    logoUrl?: string | null;
    planPaid: boolean;
    planLabel: string;
    commissionBps: number;
    bookingBadge: number;
    alerts: number;
}) {
    const path = usePathname(), router = useRouter();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false), [query, setQuery] = useState('');
    const drawer = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => { setOpen(false); }, [path]);
    useEffect(() => { if (!open)
        return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; drawer.current?.querySelector<HTMLElement>('a')?.focus(); const handle = (e: KeyboardEvent) => { if (e.key === 'Escape')
        setOpen(false); if (e.key === 'Tab') {
        const els = [...drawer.current!.querySelectorAll<HTMLElement>('a,button,input')].filter(e => e.getClientRects().length);
        const first = els[0], last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    } }; document.addEventListener('keydown', handle); return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', handle); trigger.current?.focus(); }; }, [open]);
    const current = VENDOR_NAV.flatMap(g => g.items).find(i => path === i.href || path.startsWith(i.href + '/'))?.label || 'Dashboard';
    const sidebar = <div className="flex h-full flex-col bg-bg2"><Link href="/vendor/dashboard" className="flex min-h-20 items-center gap-3 px-5"><BrandLogo className="h-10 w-32 object-contain object-left"/><span className="sr-only">NaijaSpa vendor home</span></Link><p className="-mt-3 mb-4 pl-5 text-[10px] uppercase tracking-[0.18em] text-ink2">Vendor portal</p>
 <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-line bg-elev p-2.5">{logoUrl ? <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover"/> : <span className="vendor-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest text-xs font-bold text-gold">{initials(businessName)}</span>}<div className="min-w-0"><p className="truncate text-xs font-semibold">{businessName}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink2"><ShieldCheck className="h-3 w-3 shrink-0"/>{subtitle}</p></div></div>
 <nav aria-label="Vendor navigation" className="min-h-0 flex-1 overflow-y-auto px-3">{VENDOR_NAV.map(g => <div key={g.label} className="mb-5"><p className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.12em] text-ink2">{g.label}</p><ul className="space-y-0.5">{g.items.map(item => { const active = path === item.href || path.startsWith(item.href + '/'); return <li key={item.href}><Link href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)} className={`relative flex min-h-9 items-center gap-3 rounded-lg px-3 text-xs ${active ? 'bg-elev font-semibold text-ink' : 'text-ink2 hover:bg-elev hover:text-ink'}`}>{active ? <span className="absolute left-0 h-6 w-0.5 rounded bg-gold"/> : null}<PendingIcon icon={item.icon}/><span className="flex-1">{item.href === '/vendor/subscriptions' ? 'Subscription' : item.label}</span>{item.href === '/vendor/bookings' && bookingBadge > 0 ? <span className="rounded-lg bg-gold/10 px-1.5 py-1 text-[10px] text-goldink">{bookingBadge}</span> : null}</Link></li>; })}</ul></div>)}</nav>
 <div className="border-t border-line p-3"><Link href="/vendor/subscriptions" className="block rounded-xl bg-elev p-3"><p className="flex items-center gap-2 text-xs font-semibold"><Crown className="h-4 w-4 text-goldink"/>{planLabel}</p><p className="mt-1 text-[10px] text-ink2">{commissionBps / 100}% commission{planPaid ? ' · Manage subscription' : ' · Compare plans'}</p></Link><LogoutButton variant="row" href="/login/vendor" className="mt-2"/></div></div>;
    return <div className="vendor-portal flex min-h-screen bg-bg text-ink"><aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-line lg:block">{sidebar}</aside>{open ? <div ref={drawer} className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Vendor navigation"><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation backdrop" className="absolute inset-0 bg-black/60"/><aside className="absolute inset-y-0 left-0 w-[min(280px,85vw)] border-r border-line">{sidebar}</aside><button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg bg-card p-2"><X /></button></div> : null}
 <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg px-4 sm:px-8"><button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 hover:bg-elev lg:hidden"><Menu className="h-5 w-5"/></button><p className="hidden min-w-0 truncate text-xs text-ink2 sm:block">{businessName}<span className="mx-3 text-line">/</span><span className="text-ink">{current}</span></p><form className="relative ml-auto hidden xl:block" onSubmit={e => { e.preventDefault(); router.push('/vendor/bookings?q=' + encodeURIComponent(query)); }}><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink2"/><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search bookings, customers, services" placeholder="Search bookings, customers…" className="h-9 w-64 rounded-lg border border-line bg-bg pl-9 pr-3"/></form><Link href="/vendor/subscriptions" className="ml-auto rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-semibold text-goldink xl:ml-0">{planPaid ? 'Paid' : 'Free'} · {commissionBps / 100}%</Link><button aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} onClick={async () => { await toggle(); }} className="rounded-full p-2 hover:bg-elev">{theme === 'dark' ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}</button><Link href="/vendor/notifications" aria-label={alerts ? `Notifications, ${alerts} unread` : 'Notifications'} className="relative rounded-full p-2 hover:bg-elev"><Bell className="h-4 w-4"/>{alerts > 0 ? <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-gold"/> : null}</Link><Link href="/vendor/settings/security" aria-label="Account settings" className="vendor-avatar flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elev text-[10px] font-semibold text-leaf">{initials(userName)}</Link></header><main className="mx-auto max-w-[1600px] px-4 pb-16 pt-7 sm:px-8">{children}</main></div></div>;
}
