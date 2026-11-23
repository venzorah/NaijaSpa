"use client";

import { useState } from "react";

export function ActivateShopButton() {
  const [message, setMessage] = useState("");
  return (
    <button
      type="button"
      className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-bold text-ongold"
      onClick={async () => {
        const res = await fetch("/api/shop/vendor/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "activate" }) });
        const data = await res.json();
        setMessage(res.ok ? "Application sent." : data.error || "Could not apply");
      }}
    >
      Activate Product Store
      {message ? <span className="ml-2 font-normal">{message}</span> : null}
    </button>
  );
}
