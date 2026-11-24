"use client";

import { useState } from "react";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

export function OrderReturnForm({ vendorOrderId }: { vendorOrderId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const reason = String(new FormData(e.currentTarget).get("reason") || "");
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch("/api/shop/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorOrderId, reason }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not request a return");
          setMessage("Return requested.");
          shopSuccess("Return requested. We will update this order when the seller responds.");
        } catch (err) {
          const text = err instanceof Error ? err.message : "Could not request a return";
          setMessage(text);
          shopError(text);
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea name="reason" required minLength={4} placeholder="Reason for return" className="rounded-2xl border border-line p-3 text-sm" />
      <button disabled={busy} className="h-10 w-fit rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60">
        {busy ? "Sending…" : "Request return"}
      </button>
      {message ? <p className="text-xs text-goldink">{message}</p> : null}
    </form>
  );
}
