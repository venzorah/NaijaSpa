"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { GoldButton } from "@/components/shell";
import { BottomSheet } from "@/components/bottom-sheet";

const reasons = ["Schedule conflict", "Feeling unwell", "Booked by mistake", "Found another time", "Other"];

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <GoldButton tone="outline" className="!text-red-600 dark:!text-red-300" onClick={() => setOpen(true)}>
        <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
        Cancel booking
      </GoldButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Cancel booking?">
        <p className="text-sm text-ink2">Tell us why you’re cancelling. Refunds follow the provider’s cancellation window.</p>
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink2">Reason</p>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${reason === r ? "border-gold bg-gold text-ongold" : "border-line bg-card text-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <GoldButton
          className="mt-5 w-full !bg-red-600 !text-white hover:!bg-red-700"
          disabled={!reason || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            const res = await fetch("/api/bookings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: bookingId, action: "cancel", reason })
            });
            const json = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) {
              setError(json.error || "Could not cancel this booking.");
              return;
            }
            setOpen(false);
            router.refresh();
          }}
        >
          Confirm cancellation
        </GoldButton>
      </BottomSheet>
    </>
  );
}
