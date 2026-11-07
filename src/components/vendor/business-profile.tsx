"use client";
import { useToastMessage } from "@/components/vendor/toasts";
import { useRef, useState } from "react";
import { BusinessPhotos } from "./business-photos";
import { uploadBusinessPhoto } from "@/lib/business-photo-upload";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Camera, MapPin, Star } from "lucide-react";
import { VendorPageHeader } from "./page-header";
import { Panel } from "@/components/admin/panel";
import { EditorModal } from "@/components/admin/editor-modal";
import { adminField, adminBtn, adminBtnOutline, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import { NIGERIA_STATES, nigeriaStateLabel } from "@/lib/nigeria";
import { vendorPublicProfileState } from "@/lib/vendor-public-profile";
import { formatNgn } from "@/lib/money";
type Profile = {
    businessName: string;
    providerType: string;
    description: string;
    privatePhone: string;
    privateWhatsapp: string;
    instagramUrl: string;
    state: string;
    city: string;
    neighbourhood: string;
    address: string;
    cancellationPolicy: string;
    hoursJson: string;
};
export function VendorBusinessProfile({ initial, slug, coverUrl, logoUrl, images, services, verified, publicContact, rating, reviewCount, applicationStatus, visibility }: {
    initial: Profile;
    slug: string;
    coverUrl: string | null;
    logoUrl: string | null;
    images: {
        id: string;
        url: string;
    }[];
    services: {
        id: string;
        slug: string;
        name: string;
        durationMin: number;
        basePriceKobo: number;
    }[];
    verified: boolean;
    publicContact: boolean;
    rating: number;
    reviewCount: number;
    applicationStatus: string;
    visibility: string;
}) {
    const router = useRouter();
    const publicProfile = vendorPublicProfileState(visibility, applicationStatus);
    const fileInput = useRef<HTMLInputElement>(null);
    const deviceTarget = useRef<'cover' | 'logo'>('cover');
    function openDevice(target: 'cover' | 'logo') { deviceTarget.current = target; fileInput.current?.click(); }
    async function uploadPhoto(file: File | undefined) {
        if (!file || busy) return;
        const target = deviceTarget.current;
        setBusy(true); setStatus('');
        try { await uploadBusinessPhoto(file, target); setPicker(null); setStatus(target === 'cover' ? 'Cover photo updated.' : 'Business logo updated.', 'success'); }
        catch (error) { setStatus(error instanceof Error ? error.message : 'Could not upload photo.'); }
        finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; router.refresh(); }
    }
    const [form, setForm] = useState(initial), [busy, setBusy] = useState(false), [status, setStatus, feedbackKind] = useToastMessage(), [picker, setPicker] = useState<'cover' | 'logo' | null>(null);
    const field = (key: keyof Profile, value: string) => setForm(f => ({ ...f, [key]: value }));
    async function save() { if (busy)
        return; setBusy(true); setStatus(''); try {
        await adminJson('/api/vendor/onboarding', { method: 'PATCH', body: JSON.stringify({ ...form, submit: false }) });
        setStatus('Business profile saved.', 'success');
        router.refresh();
    }
    catch (e) {
        setStatus(e instanceof Error ? e.message : 'Could not save.');
    }
    finally {
        setBusy(false);
    } }
    async function choose(imageId: string) { setBusy(true); setStatus(''); try {
        await adminJson('/api/vendor/profile', { method: 'PATCH', body: JSON.stringify({ imageId, target: picker }) });
        setPicker(null);
        setStatus(picker === 'cover' ? 'Cover photo updated.' : 'Business logo updated.', 'success');
        router.refresh();
    }
    catch (e) {
        setStatus(e instanceof Error ? e.message : 'Could not update image.');
    }
    finally {
        setBusy(false);
    } }
    return <div><input ref={fileInput} type="file" aria-label="Upload business cover or logo" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => void uploadPhoto(event.target.files?.[0])} /><VendorPageHeader title="Business profile" description="Manage what guests see when they find you on NaijaSpa." actions={<><button type="button" disabled={busy} className={adminBtnOutline} onClick={() => { setForm(initial); setStatus('Changes discarded.', 'info'); }}>Discard</button><button type="submit" form="vendor-business-form" disabled={busy} className={adminBtn}>{busy ? 'Saving…' : 'Save changes'}</button></>}/>{status && feedbackKind === "error" ? <p role="status" className="mb-4 rounded-lg border border-line bg-card p-3 text-sm">{status}</p> : null}<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><div className="space-y-4"><section className="overflow-hidden rounded-xl border border-line bg-card"><div className="relative flex h-52 items-center justify-center bg-elev">{coverUrl ? <img src={coverUrl} alt="Business cover" className="h-full w-full object-cover"/> : <span className="text-sm text-ink2">Add your business cover photo</span>}<button type="button" disabled={busy} onClick={() => openDevice('cover')} className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-bg/90 px-3 py-2 text-xs font-semibold"><Camera className="h-4 w-4"/>Change cover</button></div><div className="px-5"><button type="button" aria-label="Change business logo" disabled={busy} onClick={() => openDevice('logo')} className="relative -mt-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-elev">{logoUrl ? <img src={logoUrl} alt="Business logo" className="h-full w-full object-cover"/> : <Camera className="h-6 w-6 text-goldink"/>}</button><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => setPicker('cover')} className="text-xs font-semibold text-goldink">Choose existing cover</button><button type="button" disabled={busy} onClick={() => setPicker('logo')} className="text-xs font-semibold text-goldink">Choose existing logo</button></div></div><form id="vendor-business-form" onSubmit={e => { e.preventDefault(); void save(); }} className="grid gap-4 p-5 sm:grid-cols-2"><FormRow label="Business name" htmlFor="business-name"><input required minLength={2} id="business-name" className={adminField} value={form.businessName} onChange={e => field('businessName', e.target.value)}/></FormRow><FormRow label="Business type" htmlFor="business-type"><select id="business-type" className={adminField} value={form.providerType} onChange={e => field('providerType', e.target.value)}>{[['spa', 'Spa or salon'], ['independent', 'Independent therapist'], ['hotel', 'Hotel spa'], ['mobile', 'Mobile / home visits']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormRow><div className="sm:col-span-2"><FormRow label="About" htmlFor="business-about"><textarea id="business-about" rows={4} className={adminField} value={form.description} onChange={e => field('description', e.target.value)}/></FormRow></div><FormRow label="State" htmlFor="business-state"><select id="business-state" className={adminField} value={form.state} onChange={e => { field('state', e.target.value); field('city', ''); field('neighbourhood', ''); }}>{NIGERIA_STATES.map(s => <option key={s} value={s}>{nigeriaStateLabel(s)}</option>)}</select></FormRow><FormRow label="City" htmlFor="business-city"><input id="business-city" required minLength={2} className={adminField} value={form.city} onChange={e => field('city', e.target.value)}/></FormRow><FormRow label="Area" htmlFor="business-area"><input id="business-area" className={adminField} value={form.neighbourhood} onChange={e => field('neighbourhood', e.target.value)}/></FormRow><FormRow label="Address" htmlFor="business-address"><input id="business-address" required minLength={4} className={adminField} value={form.address} onChange={e => field('address', e.target.value)}/></FormRow>{([['privatePhone', 'Phone'], ['privateWhatsapp', 'WhatsApp'], ['instagramUrl', 'Instagram URL']] as const).map(([key, label]) => <FormRow key={key} label={label} htmlFor={'business-' + key}><input id={'business-' + key} className={adminField} value={form[key]} onChange={e => field(key, e.target.value)}/></FormRow>)}<div className="sm:col-span-2"><p className="mb-4 text-xs text-ink2">{publicContact ? 'Direct contact is visible on your public listing.' : 'Direct contact stays private until an eligible paid listing plan is active.'}</p><FormRow label="Cancellation policy" htmlFor="business-policy"><textarea id="business-policy" rows={2} className={adminField} value={form.cancellationPolicy} onChange={e => field('cancellationPolicy', e.target.value)}/></FormRow></div></form></section><BusinessPhotos revision={images.map(image => image.id).join(',')} onChanged={() => router.refresh()} /><Panel title="Opening hours & coverage"><p className="text-sm text-ink2">Set business hours, location types and therapist schedules to control the appointments guests can book.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/vendor/availability" className={adminBtnOutline}>Edit availability</Link><Link href="/vendor/staff" className={adminBtnOutline}>Staff & schedules</Link></div></Panel><Panel title="Application"><p className="text-sm capitalize">{applicationStatus.replaceAll('_', ' ')}</p><p className="mt-2 text-sm text-ink2">Saving your profile preserves its current approval status.</p><Link href="/vendor/onboarding" className="mt-3 inline-block text-sm font-semibold text-goldink">View onboarding & submit application →</Link></Panel></div><aside className="space-y-3 xl:sticky xl:top-24"><div className="flex items-center justify-between"><h2>Public preview</h2><span className="text-[10px] text-goldink">{publicContact ? 'Paid · contact visible' : 'Free · contact private'}</span></div><section className="overflow-hidden rounded-xl border border-line bg-card"><p className="truncate bg-elev px-4 py-2 font-mono text-[10px] text-ink2">/providers/{slug}</p>{coverUrl ? <img src={coverUrl} alt="" className="h-40 w-full object-cover"/> : null}<div className="p-4"><h2 className="flex items-center gap-2">{form.businessName}{verified ? <BadgeCheck className="h-4 w-4 text-leaf"/> : null}</h2><p className="mt-2 line-clamp-3 text-xs text-ink2">{form.description}</p><p className="my-3 flex flex-wrap items-center gap-2 text-[11px] text-ink2">{reviewCount > 0 ? <><Star className="h-3 w-3 text-goldink"/>{rating.toFixed(1)} ({reviewCount})</> : null}<MapPin className="h-3 w-3"/>{form.neighbourhood || form.city}, {nigeriaStateLabel(form.state)}</p>{publicProfile.available ? <Link href={'/providers/' + encodeURIComponent(slug)} className="block rounded-lg bg-gold px-3 py-2 text-center text-xs font-semibold text-ongold">View public profile →</Link> : <div><p className="mb-3 text-xs leading-relaxed text-ink2">{publicProfile.message}</p><button type="button" onClick={() => setStatus(publicProfile.message, "info")} className="block w-full rounded-lg border border-line bg-elev px-3 py-2 text-center text-xs font-semibold text-ink">Profile not published</button><Link href="/vendor/support" className="mt-3 inline-block text-xs font-semibold text-goldink">Contact support →</Link></div>}<ul className="mt-4 space-y-2">{services.slice(0, 3).map(s => <li key={s.id}><Link href={'/services/' + encodeURIComponent(s.slug)} className="flex justify-between gap-3 rounded-lg border border-line p-3 text-[11px]"><span>{s.name}<span className="mt-1 block text-ink2">{s.durationMin} min</span></span><span className="shrink-0 font-semibold">{formatNgn(s.basePriceKobo)}</span></Link></li>)}</ul></div></section></aside></div>{picker ? <EditorModal title={picker === 'cover' ? 'Choose cover photo' : 'Choose business logo'} busy={busy} onClose={() => setPicker(null)}><div className="grid grid-cols-3 gap-3">{images.map(i => <button key={i.id} disabled={busy} aria-label={'Select photo ' + i.id} onClick={() => void choose(i.id)}><img src={i.url} alt="Your gallery photo" className="aspect-square w-full rounded-lg object-cover"/></button>)}</div><button type="button" disabled={busy} onClick={() => openDevice(picker)} className={`${adminBtnOutline} mt-4`}>Upload from device</button>{!images.length ? <p className="mt-3 text-sm text-ink2">Select a photo directly from your phone or computer.</p> : null}{status ? <p role="status" className="mt-3 text-sm">{status}</p> : null}</EditorModal> : null}</div>;
}
