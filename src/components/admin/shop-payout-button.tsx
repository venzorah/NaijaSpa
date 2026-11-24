"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAction } from "@/lib/action-feedback";

export function ShopPayoutButton({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="mt-2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold disabled:opacity-60"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/admin/shop/payouts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vendorId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not pay out.");
            notifyAction("success", "Payout requested.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not pay out.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Paying…" : "Pay available balance"}
      </button>
      {error ? <p role="alert" className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
