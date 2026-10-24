"use client";

import { useTheme } from "@/components/theme-provider";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { LogoutButton } from "@/components/logout-button";

export default function Page() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <VendorPageHeader title="Settings" description="Appearance and how this portal behaves on your device." />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Appearance">
          <p className="text-sm text-ink2">NaijaSpa defaults to dark. Switch anytime — we store the choice on this device.</p>
          <button type="button" onClick={toggle} className="mt-4 min-h-11 rounded-full border border-line px-5 text-sm font-semibold">
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
        </Panel>
        <Panel title="Notifications">
          <p className="text-sm text-ink2">
            Booking alerts appear as the badge on Bookings. Open tickets light the bell in the top bar. Email delivery is handled by NaijaSpa operations.
          </p>
        </Panel>
        <Panel title="Session">
          <p className="text-sm text-ink2">Sign out of this device. You can always come back at /login/vendor.</p>
          <LogoutButton href="/login/vendor" className="mt-4" />
        </Panel>
      </div>
    </div>
  );
}
