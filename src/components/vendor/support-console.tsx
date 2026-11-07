"use client";
import { useToast, useToastMessage } from "@/components/vendor/toasts";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy, Plus, Send } from "lucide-react";
import { VendorPageHeader } from "./page-header";
import { Panel } from "@/components/admin/panel";
import { EditorModal } from "@/components/admin/editor-modal";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { WhatsAppSupport } from "@/components/whatsapp-support";
type Ticket = {
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    messages: {
        id: string;
        body: string;
        createdAt: string;
        own: boolean;
    }[];
};
export function VendorSupportConsole({ tickets }: {
    tickets: Ticket[];
}) {
    const router = useRouter();
    const toast = useToast();
    const [selected, setSelected] = useState(tickets[0]?.id ?? ''), [open, setOpen] = useState(false), [subject, setSubject] = useState(''), [message, setMessage] = useState(''), [reply, setReply] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useToastMessage();
    const ticket = tickets.find(t => t.id === selected) ?? tickets[0];
    async function send(create: boolean) { if (busy)
        return; setBusy(true); setError(''); try {
        const result = await adminJson<{
            ticket: {
                id: string;
            };
        }>(create ? '/api/vendor/tickets' : `/api/vendor/tickets/${ticket?.id}`, { method: 'POST', body: JSON.stringify(create ? { subject, message } : { message: reply }) });
        if (create) {
            setOpen(false);
            setSubject('');
            setMessage('');
            setSelected(result.ticket.id);
        }
        else
            setReply('');
        toast.success(create ? 'Support ticket created.' : 'Reply sent.');
        router.refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send message.');
    }
    finally {
        setBusy(false);
    } }
    return <div><VendorPageHeader title="Support" description="Get help with verification, bookings, your listing and payouts." actions={<><Link href="/vendor/support/help" className={adminBtnOutline}>Help centre</Link><button className={adminBtn} onClick={() => { setError(''); setOpen(true); }}><Plus className="h-4 w-4"/>New ticket</button></>}/><WhatsAppSupport prefill="Hello NaijaSpa, I need vendor support."/>{error && !open ? <p role="alert" className="mb-4 text-red-600 dark:text-red-300">{error}</p> : null}<div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"><Panel bodyClassName="p-0">{tickets.length ? tickets.map(t => <button key={t.id} onClick={() => { setSelected(t.id); setReply(''); setError(''); }} className={`block w-full border-b border-line p-5 text-left last:border-b-0 hover:bg-elev ${ticket?.id === t.id ? 'bg-elev' : ''}`}><p className="text-[10px] text-ink2">TCK-{t.id.slice(-6).toUpperCase()} · {new Date(t.updatedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}</p><p className="my-2 text-sm font-semibold">{t.subject}</p><AdminStatusPill status={t.status}/></button>) : <div className="p-8 text-center text-ink2"><LifeBuoy className="mx-auto mb-3 h-8 w-8"/><p>No tickets yet. Open a ticket whenever you need help.</p></div>}</Panel>{ticket ? <Panel title={ticket.subject} description={`TCK-${ticket.id.slice(-6).toUpperCase()}`} actions={<AdminStatusPill status={ticket.status}/>}><div className="space-y-6">{ticket.messages.map(m => <article key={m.id}><p className="mb-2 text-xs font-semibold text-ink2">{m.own ? 'You' : 'NaijaSpa Support'} · {new Date(m.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p><p className="whitespace-pre-wrap break-words rounded-lg bg-elev p-4 text-sm">{m.body}</p></article>)}</div>{['closed', 'resolved'].includes(ticket.status) ? <p className="mt-6 border-t border-line pt-4 text-sm text-ink2">This ticket is closed. Open a new ticket if you need more help.</p> : <form className="mt-6 border-t border-line pt-5" onSubmit={e => { e.preventDefault(); void send(false); }}><FormRow label="Reply" htmlFor="ticket-reply"><textarea id="ticket-reply" minLength={4} maxLength={10000} required rows={4} value={reply} onChange={e => setReply(e.target.value)} className={adminField}/></FormRow><button className={`${adminBtn} mt-3`} disabled={busy || reply.trim().length < 4}><Send className="h-4 w-4"/>{busy ? 'Sending…' : 'Send reply'}</button></form>}</Panel> : null}</div>{open ? <EditorModal title="New support ticket" busy={busy} onClose={() => setOpen(false)}><form onSubmit={e => { e.preventDefault(); void send(true); }} className="space-y-4"><FormRow label="Subject" htmlFor="ticket-subject"><input id="ticket-subject" data-initial-focus className={adminField} required minLength={4} maxLength={200} value={subject} onChange={e => setSubject(e.target.value)}/></FormRow><FormRow label="Message" htmlFor="ticket-message"><textarea id="ticket-message" required minLength={4} maxLength={10000} rows={5} className={adminField} value={message} onChange={e => setMessage(e.target.value)}/></FormRow>{error ? <p role="alert" className="text-red-600">{error}</p> : null}<button disabled={busy} className={adminBtn}>{busy ? 'Sending…' : 'Send ticket'}</button></form></EditorModal> : null}</div>;
}
