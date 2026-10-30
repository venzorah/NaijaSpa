"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiProvider, AiSettings } from "@/lib/ai-settings";
import { adminJson } from "./json";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "./form-row";

const LABELS: Record<AiProvider, string> = { gemini: "Google Gemini", openai: "OpenAI", local: "Local search" };

export function AiProviderSettings({ initial, configured, editable }: {
  initial: AiSettings; configured: Record<AiProvider, boolean>; editable: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const provider = settings.provider;
  async function run(action: "save" | "test") {
    setBusy(true); setNotice(""); setError("");
    try {
      await adminJson(action === "save" ? "/api/admin/ai" : "/api/admin/ai/test", {
        method: action === "save" ? "PUT" : "POST", body: JSON.stringify(settings)
      });
      setNotice(action === "save" ? "Saved. New searches use this selection." : `${LABELS[provider]} test passed. Save to activate this selection.`);
      if (action === "save") router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run("save"); }}>
      <FormRow label="Active provider" htmlFor="ai-provider">
        <select id="ai-provider" className={adminField} disabled={!editable || busy} value={provider}
          onChange={(e) => { setSettings({ ...settings, provider: e.target.value as AiProvider }); setNotice(""); setError(""); }}>
          {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </FormRow>
      {provider !== "local" ? (
        <FormRow label="Model ID" htmlFor="ai-model">
          <input id="ai-model" className={adminField} required maxLength={120} disabled={!editable || busy} value={settings.models[provider]}
            onChange={(e) => { setSettings({ ...settings, models: { ...settings.models, [provider]: e.target.value } }); setNotice(""); setError(""); }} />
        </FormRow>
      ) : null}
      <p className="text-sm text-ink2">{provider === "local" ? "Uses the local search parser without an external API."
        : configured[provider] ? `${LABELS[provider]} key is configured on this server.`
          : `${LABELS[provider]} key is missing. Add ${provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} to the server environment and restart the app.`}</p>
      {provider === "gemini" ? <p className="text-xs text-ink2">Free-tier availability and quotas depend on your Google AI Studio project.</p> : null}
      <p className="text-xs text-ink2">Search uses the local fallback if the selected provider fails or reaches its quota.</p>
      {editable ? <div className="flex flex-wrap gap-2">
        <button className={adminBtn} disabled={busy}>{busy ? "Working…" : "Save selection"}</button>
        <button type="button" className={adminBtnOutline} disabled={busy || !configured[provider]} onClick={() => void run("test")}>Test connection</button>
      </div> : <p className="text-xs text-ink2">Your role can view these settings.</p>}
      {notice ? <p role="status" className="text-sm text-leaf">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
