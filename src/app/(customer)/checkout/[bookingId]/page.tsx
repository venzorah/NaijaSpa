"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { BookingStepper } from "@/components/booking-stepper";

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24">
      <BookingStepper current={4} />
      <h1 className="mt-6 font-display text-4xl">Pay</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink2">
        Paystack holds card data. NaijaSpa never stores card numbers. Bookings confirm only after verified payment or
        webhook.
      </p>
      <button
        disabled={busy}
        className="mt-6 min-h-12 w-full rounded-full bg-gold font-bold text-ongold disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/payments/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId })
          });
          const json = await res.json();
          setBusy(false);
          if (json.authorizationUrl) {
            window.location.href = json.authorizationUrl;
            return;
          }
          setMsg(json.message || json.error || "Payment provider is not configured.");
        }}
      >
        {busy ? "Opening Paystack…" : "Pay with Paystack"}
      </button>
      {msg && <p className="mt-4 text-sm text-ink2">{msg}</p>}
    </div>
  );
}
