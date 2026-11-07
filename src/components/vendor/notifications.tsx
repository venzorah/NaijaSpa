"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { VendorPageHeader } from "./page-header";
import { Panel } from "@/components/admin/panel";
import { adminBtnOutline } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
export function VendorNotifications({ rows }: {
    rows: {
        id: string;
        title: string;
        body: string;
        createdAt: string;
        readAt: string | null;
        actionUrl: string;
    }[];
}) { const router = useRouter(); const [busy, setBusy] = useState(false), [error, setError] = useState(''); async function read(id?: string) { setBusy(true); setError(''); try {
    await adminJson('/api/vendor/notifications', { method: 'PATCH', body: JSON.stringify({ id }) });
    router.refresh();
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Could not update.');
}
finally {
    setBusy(false);
} } return <div><VendorPageHeader title="Notifications" description="Your latest account and booking updates." actions={<><Link href="/vendor/settings/notifications" className={adminBtnOutline}>Preferences</Link><button disabled={busy || !rows.some(r => !r.readAt)} className={adminBtnOutline} onClick={() => void read()}><CheckCheck className="h-4 w-4"/>Mark all read</button></>}/>{error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}<Panel bodyClassName="p-0">{rows.length ? rows.map(r => <article key={r.id} className={`border-b border-line p-5 last:border-0 ${r.readAt ? '' : 'bg-gold/5'}`}><div className="flex items-start gap-3"><Bell className="mt-1 h-4 w-4 shrink-0 text-goldink"/><div className="min-w-0 flex-1"><p className="font-semibold">{r.title}</p><p className="my-2 whitespace-pre-wrap break-words text-sm text-ink2">{r.body}</p><p className="text-xs text-ink2">{new Date(r.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p><div className="mt-3 flex gap-4"><Link href={r.actionUrl} className="text-xs font-semibold text-goldink">Open →</Link>{!r.readAt ? <button disabled={busy} onClick={() => void read(r.id)} className="text-xs text-ink2">Mark read</button> : null}</div></div></div></article>) : <p className="p-10 text-center text-sm text-ink2">You’re all caught up. No notifications yet.</p>}</Panel></div>; }
