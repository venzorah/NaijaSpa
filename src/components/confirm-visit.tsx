"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConfirmVisit({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch(`/api/account/bookings/${bookingId}/complete`, { method: "POST" });
            const json = await res.json();
            if (!res.ok) setError(json.error || "Could not confirm this visit.");
            else router.refresh();
          } catch {
            setError("Could not confirm this visit.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Confirming…" : "Confirm I received this service"}
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
