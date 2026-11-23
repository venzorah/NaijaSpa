"use client";

import { useState } from "react";

export function OrderReturnForm({ vendorOrderId }: { vendorOrderId: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") || "");
        const res = await fetch("/api/shop/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorOrderId, reason }) });
        const data = await res.json();
        setMessage(res.ok ? "Return requested." : data.error || "Could not request a return");
      }}
    >
      <textarea name="reason" required minLength={4} placeholder="Reason for return" className="rounded-2xl border border-line p-3 text-sm" />
      <button className="h-10 w-fit rounded-full border border-line px-4 text-sm font-semibold">Request return</button>
      {message ? <p className="text-xs text-goldink">{message}</p> : null}
    </form>
  );
}
