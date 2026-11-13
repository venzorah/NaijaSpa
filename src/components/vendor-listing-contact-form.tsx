"use client";
import { useToastMessage } from "@/components/vendor/toasts";

import { useEffect, useState } from "react";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";

type Payload = {
  paid?: boolean;
  public?: boolean;
  email?: string;
  privatePhone?: string;
  privateWhatsapp?: string;
  instagramUrl?: string;
  error?: string;
};

export function VendorListingContactForm({ highlightMissing = false }: { highlightMissing?: boolean }) {
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage, feedbackKind] = useToastMessage();

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/vendor/listing-contact");
        const json = (await res.json()) as Payload;
        if (!res.ok) {
          setMessage(json.error || "Could not load listing contact.");
          return;
        }
        setPaid(Boolean(json.paid));
        setVisible(Boolean(json.public));
        setEmail(json.email || "");
        setPhone(json.privatePhone || "");
        setWhatsapp(json.privateWhatsapp || "");
        setInstagram(json.instagramUrl || "");
      } catch {
        setMessage("Could not load listing contact.");
      }
    })();
  }, []);

  const missing = !phone.trim() || !whatsapp.trim() || !instagram.trim();

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/vendor/listing-contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privatePhone: phone,
          privateWhatsapp: whatsapp,
          instagramUrl: instagram
        })
      });
      const json = (await res.json()) as Payload;
      if (!res.ok) {
        setMessage(json.error || "Could not save.");
        return;
      }
      setPaid(Boolean(json.paid));
      setVisible(Boolean(json.public));
      setMessage(json.public ? "Saved. NaijaSpa has turned public contact on for your listing." : "Saved. These stay private on Explore. Customers see WhatsApp and in-app chat after they pay.", "success");
    } catch {
      setMessage("Could not save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Contact details"
      description={
        visible
          ? "NaijaSpa has turned public contact on. Phone, WhatsApp, login email and Instagram appear on Explore."
          : "These stay hidden on Explore. After a customer pays, they can WhatsApp you and use in-app chat."
      }
    >
      {highlightMissing && paid && missing ? (
        <p className="mb-3 text-sm text-goldink">Add anything that was missing on Free, then save.</p>
      ) : null}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormRow label="Phone" htmlFor="listing-phone">
          <input
            id="listing-phone"
            className={adminField}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234…"
          />
        </FormRow>
        <FormRow label="WhatsApp" htmlFor="listing-wa">
          <input
            id="listing-wa"
            className={adminField}
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+234…"
          />
        </FormRow>
        <FormRow label="Instagram" htmlFor="listing-ig">
          <input
            id="listing-ig"
            className={adminField}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourspa or instagram.com/yourspa"
          />
        </FormRow>
        <FormRow label="Public email" htmlFor="listing-email">
          <input id="listing-email" className={adminField} value={email} readOnly />
        </FormRow>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className={adminBtn} disabled={busy}>
            {busy ? "Saving…" : "Save listing details"}
          </button>
          {visible ? null : (
            <p className="text-sm text-ink2">Public contact is switched on by NaijaSpa, not by a listing plan.</p>
          )}
        </div>
      </form>
      {message && feedbackKind === "error" ? <p className="mt-3 text-sm text-ink2">{message}</p> : null}
    </Panel>
  );
}
