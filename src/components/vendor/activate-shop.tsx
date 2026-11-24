"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAction } from "@/lib/action-feedback";

export function ActivateShopButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-bold text-ongold disabled:opacity-60"
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch("/api/shop/vendor/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "activate" })
          });
          const data = await res.json();
          if (!res.ok) {
            setMessage(data.error || "Could not apply");
            notifyAction("error", data.error || "Could not apply");
            return;
          }
          notifyAction("success", "Product Store request saved.");
          router.push(data.home || "/vendor/shop");
          router.refresh();
        } catch {
          setMessage("Could not apply. Check your connection.");
          notifyAction("error", "Could not apply. Check your connection.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saving…" : "Activate Product Store"}
      {message ? <span className="ml-2 font-normal">{message}</span> : null}
    </button>
  );
}
