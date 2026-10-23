"use client";

import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-3xl">Settings</h1>
      <button type="button" onClick={toggle} className="mt-6 min-h-12 rounded-full border border-line px-5">
        {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fd.get("email") }) });
          alert("If the account exists, a reset was queued.");
        }}
      >
        <p className="text-sm font-semibold">Request account deletion</p>
        <input name="email" type="email" required placeholder="Confirm email" className="min-h-11 w-full rounded-2xl border border-line bg-card px-3" />
        <button className="text-sm underline">Submit deletion request via support</button>
      </form>
    </div>
  );
}
