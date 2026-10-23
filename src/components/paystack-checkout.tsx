"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InitResponse = {
  authorizationUrl?: string | null;
  accessCode?: string | null;
  publicKey?: string;
  reference?: string;
  alreadyPaid?: boolean;
  blocked?: boolean;
  message?: string | null;
  error?: string;
};

declare global {
  interface Window {
    PaystackPop?: new () => {
      resumeTransaction: (
        accessCode: string,
        callbacks?: {
          onSuccess?: (transaction: { reference?: string }) => void;
          onCancel?: () => void;
        }
      ) => void;
    };
  }
}

function loadInline(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-naijaspa-paystack="inline"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Paystack script failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.dataset.naijaspaPaystack = "inline";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paystack script failed"));
    document.body.appendChild(script);
  });
}

export function PaystackCheckout({
  bookingId,
  amountLabel,
  alreadyConfirmed
}: {
  bookingId: string;
  amountLabel: string;
  alreadyConfirmed: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState(alreadyConfirmed ? "This booking is already paid." : "");
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (alreadyConfirmed) {
      router.push("/account/bookings");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const json = (await res.json()) as InitResponse;
      if (json.alreadyPaid) {
        router.push("/account/bookings");
        return;
      }
      if (json.blocked || (!json.accessCode && !json.authorizationUrl)) {
        setMsg(json.message || json.error || "Paystack is not configured on this host.");
        return;
      }

      try {
        await loadInline();
        if (json.accessCode && window.PaystackPop) {
          const popup = new window.PaystackPop();
          popup.resumeTransaction(json.accessCode, {
            onSuccess: (transaction) => {
              const reference = transaction.reference || json.reference || "";
              router.push(`/checkout/verify?reference=${encodeURIComponent(reference)}`);
            },
            onCancel: () => setMsg("Payment window closed. You can try again when you are ready.")
          });
          return;
        }
      } catch {
        /* fall through to hosted checkout */
      }

      if (json.authorizationUrl) {
        window.location.href = json.authorizationUrl;
        return;
      }
      setMsg(json.message || json.error || "Could not open Paystack.");
    } catch {
      setMsg("Could not start payment. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="mt-6 min-h-12 w-full rounded-full bg-gold px-4 text-center font-bold leading-snug text-ongold disabled:opacity-60"
        onClick={() => void pay()}
      >
        {busy ? "Opening Paystack…" : alreadyConfirmed ? "View booking" : `Pay ${amountLabel} with Paystack`}
      </button>
      {msg && <p className="mt-4 text-sm text-ink2">{msg}</p>}
    </div>
  );
}
