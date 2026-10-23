"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [msg, setMsg] = useState("");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-3xl">Checkout</h1>
      <p className="mt-2 text-sm text-ink2">Paystack holds card data. NaijaSpa never stores card numbers. Bookings confirm only after verified payment or webhook.</p>
      <button
        className="mt-6 min-h-12 w-full rounded-full bg-gold font-bold text-ongold"
        onClick={async () => {
          const res = await fetch("/api/payments/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId })
          });
          const json = await res.json();
          if (json.authorizationUrl) {
            window.location.href = json.authorizationUrl;
            return;
          }
          setMsg(json.message || json.error || "Payment provider is not configured.");
        }}
      >
        Pay with Paystack
      </button>
      {msg && <p className="mt-4 text-sm text-ink2">{msg}</p>}
    </div>
  );
}
