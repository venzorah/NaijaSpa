"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => setSettings(j.settings || {}));
  }, []);
  return (
    <div>
      <AdminPageHeader screen="settings" />
      <Panel title="Platform defaults" description="Currency is NGN. Theme defaults to dark for every visitor unless they saved light mode.">
        <form
          className="grid max-w-lg gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await adminJson("/api/admin/settings", {
              method: "PUT",
              body: JSON.stringify({
                defaultLocale: fd.get("defaultLocale"),
                supportEmail: fd.get("supportEmail"),
                pwaName: fd.get("pwaName")
              })
            });
            setMsg("Saved.");
          }}
        >
          <FormRow label="Default locale" htmlFor="loc">
            <select key={settings["settings.defaultLocale"] || "en"} id="loc" name="defaultLocale" defaultValue={settings["settings.defaultLocale"] || "en"} className={adminField}>
              <option value="en">English</option>
              <option value="pcm">Nigerian Pidgin</option>
            </select>
          </FormRow>
          <FormRow label="Support email" htmlFor="em">
            <input id="em" name="supportEmail" type="email" defaultValue={settings["settings.supportEmail"] || "concierge@naijaspa.com"} className={adminField} />
          </FormRow>
          <FormRow label="PWA name" htmlFor="pwa">
            <input id="pwa" name="pwaName" defaultValue={settings["settings.pwaName"] || "NaijaSpa"} className={adminField} />
          </FormRow>
          <p className="text-xs text-ink2">Currency is locked to Nigerian Naira. Dark mode is the product default.</p>
          <button className={adminBtn}>Save settings</button>
          {msg ? <p className="text-xs text-goldink">{msg}</p> : null}
        </form>
      </Panel>
    </div>
  );
}
