"use client";

import { useEffect } from "react";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "./form-row";
import { adminJson } from "./json";
import { NIGERIA_STATES, nigeriaStateLabel } from "@/lib/nigeria";
import type { AdminVendorRow } from "./vendors-console";

export function VendorDetailsForm({ vendor, busy, setBusy, onCancel, onSaved }: {
  vendor: AdminVendorRow; busy: boolean; setBusy: (busy: boolean) => void; onCancel: () => void; onSaved: () => void;
}) {
  useEffect(() => { document.getElementById("vendor-business-name")?.focus(); }, []);
  return <form className="grid gap-4 sm:grid-cols-2" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const fields = ["businessName", "providerType", "description", "privatePhone", "privateWhatsapp", "instagramUrl", "state", "city", "neighbourhood", "address", "cancellationPolicy"];
    setBusy(true);
    try {
      await adminJson(`/api/admin/vendors/${vendor.id}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(fields.map(key => [key, String(form.get(key) ?? "").trim()]))) });
      onSaved();
    } catch { /* adminJson displays the error toast; retain the form so it can be retried. */ }
    finally { setBusy(false); }
  }}>
    <div className="sm:col-span-2"><h3 className="font-semibold">Edit vendor details</h3><p className="mt-1 text-xs text-ink2">Business name changes update the public URL. Existing links continue to work.</p></div>
    <fieldset disabled={busy} className="contents">
      <FormRow label="Business name" htmlFor="vendor-business-name"><input data-initial-focus id="vendor-business-name" name="businessName" defaultValue={vendor.businessName} minLength={2} maxLength={150} required className={adminField} /></FormRow>
      <FormRow label="Business type" htmlFor="vendor-type"><select id="vendor-type" name="providerType" defaultValue={vendor.providerType} className={adminField}><option value="spa">Spa or salon</option><option value="independent">Independent therapist</option><option value="hotel">Hotel spa</option><option value="mobile">Mobile / home visits</option></select></FormRow>
      <FormRow label="Mobile number" htmlFor="vendor-mobile"><input id="vendor-mobile" name="privatePhone" type="tel" maxLength={30} defaultValue={vendor.mobile} className={adminField} /></FormRow>
      <FormRow label="WhatsApp number" htmlFor="vendor-whatsapp"><input id="vendor-whatsapp" name="privateWhatsapp" type="tel" maxLength={30} defaultValue={vendor.whatsapp} className={adminField} /></FormRow>
      <FormRow label="Instagram" htmlFor="vendor-instagram"><input id="vendor-instagram" name="instagramUrl" maxLength={200} defaultValue={vendor.instagramUrl} className={adminField} /></FormRow>
      <FormRow label="State" htmlFor="vendor-state"><select id="vendor-state" name="state" defaultValue={vendor.state} required className={adminField}><option value="" disabled>Select a state</option>{NIGERIA_STATES.map(state=><option key={state} value={state}>{nigeriaStateLabel(state)}</option>)}</select></FormRow>
      <FormRow label="City" htmlFor="vendor-city"><input id="vendor-city" name="city" defaultValue={vendor.city} required minLength={2} maxLength={100} className={adminField} /></FormRow>
      <FormRow label="Neighbourhood" htmlFor="vendor-neighbourhood"><input id="vendor-neighbourhood" name="neighbourhood" defaultValue={vendor.neighbourhood} maxLength={150} className={adminField} /></FormRow>
      <div className="sm:col-span-2"><FormRow label="Address" htmlFor="vendor-address"><input id="vendor-address" name="address" defaultValue={vendor.address} required minLength={4} maxLength={500} className={adminField} /></FormRow></div>
      <div className="sm:col-span-2"><FormRow label="Description" htmlFor="vendor-description"><textarea id="vendor-description" name="description" defaultValue={vendor.description} maxLength={10000} rows={4} className={adminField} /></FormRow></div>
      <div className="sm:col-span-2"><FormRow label="Cancellation policy" htmlFor="vendor-cancellation"><textarea id="vendor-cancellation" name="cancellationPolicy" defaultValue={vendor.cancellationPolicy} maxLength={5000} rows={3} className={adminField} /></FormRow></div>
    </fieldset>
    <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2"><button type="button" disabled={busy} onClick={onCancel} className={adminBtnOutline}>Cancel editing</button><button type="submit" disabled={busy} className={adminBtn}>{busy ? "Saving…" : "Save vendor details"}</button></div>
  </form>;
}
