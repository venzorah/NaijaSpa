"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAction } from "@/lib/action-feedback";

export function ShopPayoutRequest({ availableKobo, minKobo, mode }: { availableKobo: number; minKobo: number; mode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tooSmall = availableKobo < minKobo;
  if (mode !== "request") {
    return <p className="text-sm text-ink2">Automatic payouts. Ready settlements go to your saved NUBAN after the hold period.</p>;
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy || tooSmall || availableKobo <= 0}
        className="inline-flex min-h-11 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold disabled:opacity-60"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/shop/vendor/payouts", { method: "POST" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Could not request payout.");
            notifyAction("success", "Payout requested.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not request payout.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Requesting…" : "Request payout"}
      </button>
      {tooSmall && availableKobo > 0 ? (
        <p className="mt-2 text-xs text-ink2">Available balance is below the minimum payout.</p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
