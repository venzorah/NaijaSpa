"use client";
import { useToastMessage } from "@/components/vendor/toasts";
import { useState } from "react";
import { Panel } from "@/components/admin/panel";
import { PushSettings } from "@/components/push-settings";
import { adminJson } from "@/components/admin/json";
import { adminBtn } from "@/components/admin/form-row";
import type { NotificationPreferences } from "@/lib/notification-preferences";
export function VendorNotificationPreferences({ initial }: {
    initial: NotificationPreferences;
}) { const [prefs, setPrefs] = useState(initial), [busy, setBusy] = useState(false), [status, setStatus, feedbackKind] = useToastMessage(); return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Email & reminders"><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setStatus(''); try {
    await adminJson('/api/account/notifications', { method: 'PUT', body: JSON.stringify(prefs) });
    setStatus('Notification preferences saved.', 'success');
}
catch (e) {
    setStatus(e instanceof Error ? e.message : 'Could not save.');
}
finally {
    setBusy(false);
} }} className="space-y-5">{([['email', 'Email notifications'], ['reminders', 'Appointment reminders'], ['offers', 'Offers and news']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 border-b border-line pb-4 text-sm"><span>{label}</span><input type="checkbox" checked={prefs[key]} onChange={e => setPrefs(p => ({ ...p, [key]: e.target.checked }))} className="h-4 w-4 accent-gold"/></label>)}<button disabled={busy} className={adminBtn}>{busy ? 'Saving…' : 'Save preferences'}</button>{status && feedbackKind === "error" ? <p role="status" className="text-sm text-ink2">{status}</p> : null}</form></Panel><Panel title="Browser notifications"><PushSettings /></Panel></div>; }
