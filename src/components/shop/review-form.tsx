"use client";

import { useState } from "react";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

export function ProductReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 rounded-[1.5rem] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch("/api/shop/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              rating: Number(fd.get("rating")),
              body: fd.get("body")
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not save review");
          setMessage("Review saved.");
          shopSuccess("Review saved.");
          form.reset();
        } catch (err) {
          const text = err instanceof Error ? err.message : "Could not save review";
          setMessage(text);
          shopError(text);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold">Write a review</p>
      <p className="mt-1 text-xs text-ink2">Only for products you bought on a paid Shop order.</p>
      <select name="rating" required className="mt-3 h-11 w-full rounded-2xl border border-line px-3 text-sm">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} / 5
          </option>
        ))}
      </select>
      <textarea name="body" placeholder="How was the product?" className="mt-2 min-h-24 w-full rounded-2xl border border-line p-3 text-sm" />
      <button disabled={busy} className="mt-3 h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60">
        {busy ? "Saving…" : "Submit review"}
      </button>
      {message ? <p className="mt-2 text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
