"use client";

import { useState } from "react";
import { Moon, Sun, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GoldButton } from "@/components/shell";
import { BottomSheet } from "@/components/bottom-sheet";
import { useTheme } from "@/components/theme-provider";
import { LogoutButton } from "@/components/logout-button";
import { PushSettings } from "@/components/push-settings";
import type { NotificationPreferences } from "@/lib/notification-preferences";

const field = "mt-1 h-12 w-full rounded-xl border border-line bg-bg2 px-3 text-ink";
const LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" }
] as const;

export function SettingsForm({
  firstName,
  lastName,
  email,
  phone,
  city,
  neighbourhood,
  locale,
  notificationPreferences
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  neighbourhood: string;
  locale: string;
  notificationPreferences: NotificationPreferences;
}) {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState(locale);
  const [status, setStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [notif, setNotif] = useState(notificationPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Account settings" />
      {status ? <p className="mb-3 text-sm text-leaf">{status}</p> : null}

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold text-ink">Profile</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (savingProfile) return;
            setSavingProfile(true);
            setStatus("");
            const fd = new FormData(e.currentTarget);
            const name = `${String(fd.get("first") || "").trim()} ${String(fd.get("last") || "").trim()}`.trim();
            try {
              const res = await fetch("/api/account/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  phone: fd.get("phone"),
                  city: fd.get("city"),
                  neighbourhood: fd.get("address")
                })
              });
              setStatus(res.ok ? "Profile saved" : "Could not save profile.");
            } catch { setStatus("Could not save profile. Please try again."); }
            finally { setSavingProfile(false); }
          }}
        >
          <label className="text-sm text-ink2">
            First name
            <input name="first" defaultValue={firstName} className={field} />
          </label>
          <label className="text-sm text-ink2">
            Last name
            <input name="last" defaultValue={lastName} className={field} />
          </label>
          <label className="text-sm text-ink2">
            Email
            <input type="email" defaultValue={email} disabled className={`${field} opacity-70`} />
          </label>
          <label className="text-sm text-ink2">
            Phone
            <input name="phone" type="tel" defaultValue={phone} className={field} />
          </label>
          <label className="text-sm text-ink2 sm:col-span-2">
            City
            <input name="city" defaultValue={city} className={field} />
          </label>
          <label className="text-sm text-ink2 sm:col-span-2">
            Default address
            <input name="address" defaultValue={neighbourhood} className={field} />
          </label>
          <div className="sm:col-span-2">
            <GoldButton type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save changes"}</GoldButton>
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold text-ink">Notifications</h2>
        {(
          [
            ["reminders", "Appointment reminders", "Push alerts 24h and 1h before"],
            ["offers", "Offers & promotions", "Seasonal deals from NaijaSpa partners"],
            ["sms", "SMS updates", "SMS delivery is not available yet"],
            ["email", "Email receipts", "Receipts and refund updates"]
          ] as const
        ).map(([k, label, hint]) => (
          <label key={k} className="flex min-h-[60px] items-center justify-between gap-4 border-b border-line last:border-0">
            <span>
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="block text-xs text-ink2">{hint}</span>
            </span>
            <input
              type="checkbox"
              checked={notif[k]}
              disabled={savingPreferences || k === "sms"}
              onChange={async (e) => {
                const previous = notif;
                const next = { ...notif, [k]: e.target.checked }; setNotif(next); setSavingPreferences(true);
                try {
                  const response = await fetch("/api/account/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
                  if (!response.ok) throw new Error("Could not save notification preferences");
                  setStatus("Notification preferences saved");
                } catch { setNotif(previous); setStatus("Could not save notification preferences. Try again."); }
                finally { setSavingPreferences(false); }
              }}
              className="h-5 w-5 accent-[#D4AF37]"
            />
          </label>
        ))}
        <PushSettings />
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold text-ink">Appearance</h2>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
          {([["light", "Light", Sun], ["dark", "Dark", Moon]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={theme === v}
              onClick={() => setTheme(v)}
              className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border text-sm font-semibold ${
                theme === v ? "border-gold bg-gold/10 text-ink" : "border-line text-ink2"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink2">Saved on this device. Light is the default.</p>

        <h2 className="mt-6 font-semibold text-ink">Language</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={language === l.code}
              onClick={() => {
                setLanguage(l.code);
                fetch("/api/account/profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ locale: l.code })
                }).catch(() => {});
              }}
              className={`min-h-[52px] rounded-2xl border text-sm font-semibold ${
                language === l.code ? "border-gold bg-gold/10 text-ink" : "border-line text-ink2"
              }`}
            >
              <span className="mr-1.5 font-mono text-xs uppercase text-goldink">{l.code}</span>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <LogoutButton href="/login" />

      <section className="mt-4 rounded-3xl border border-red-500/30 bg-card p-5">
        <h2 className="font-semibold text-ink">Delete account</h2>
        <p className="mt-1 text-sm text-ink2">
          Request permanent deletion of your account and personal data under the NDPA. Upcoming bookings will be cancelled.
        </p>
        <GoldButton tone="outline" className="mt-4 !border-red-500/40 !text-red-600 dark:!text-red-300" onClick={() => setDel(true)}>
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
          Request deletion
        </GoldButton>
      </section>

      <BottomSheet open={del} onClose={() => setDel(false)} title="Delete your account?">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink2">
          <li>Your profile, favourites and reviews will be removed.</li>
          <li>Upcoming bookings will be cancelled.</li>
          <li>Payment records are kept for 6 years as required by law.</li>
        </ul>
        <label className="mt-4 block text-sm text-ink2">
          Type <span className="font-mono font-bold text-ink">DELETE</span> to confirm
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
        </label>
        <GoldButton
          className="mt-4 w-full !bg-red-600 !text-white hover:!bg-red-700"
          disabled={confirm !== "DELETE"}
          onClick={async () => {
            try {
              const response = await fetch("/api/account/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deleteAccount: true })
              });
              if (!response.ok) throw new Error("Deletion request failed");
              setDel(false);
              setConfirm("");
              setStatus("Deletion requested — we’ll email you within 30 days.");
            } catch { setStatus("Could not request account deletion. Please try again."); }
          }}
        >
          Submit deletion request
        </GoldButton>
      </BottomSheet>
    </div>
  );
}
