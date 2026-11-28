"use client";

import { useState } from "react";
import { shopProductListingLabel } from "@/lib/shop/listing-status";
import { shopError, shopSuccess } from "@/lib/shop/ui-action";

export function ShopListingActions({
  id,
  status,
  endpoint,
  onDone,
  moderate = false
}: {
  id: string;
  status: string;
  endpoint: string;
  onDone?: () => void;
  moderate?: boolean;
}) {
  const [busy, setBusy] = useState("");
  const published = status === "approved";
  const deleted = status === "archived";
  async function run(next: string, label: string) {
    if (busy) return;
    if (next === "archived" && !window.confirm("Delete this listing? It will leave Shop.")) return;
    setBusy(next);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update listing.");
      shopSuccess(label);
      onDone?.();
    } catch (e) {
      shopError(e instanceof Error ? e.message : "Could not update listing.");
    } finally {
      setBusy("");
    }
  }
  const btn = "rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60";
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {deleted ? (
        <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("draft", "Listing restored as a draft.")}>
          {busy === "draft" ? "Saving…" : "Restore draft"}
        </button>
      ) : (
        <>
          {published ? (
            <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("unpublished", "Listing unpublished.")}>
              {busy === "unpublished" ? "Saving…" : "Unpublish"}
            </button>
          ) : (
            <button type="button" disabled={Boolean(busy)} className={`${btn} border-gold bg-gold text-ongold`} onClick={() => void run("approved", "Listing published.")}>
              {busy === "approved" ? "Saving…" : "Publish"}
            </button>
          )}
          {status !== "draft" ? (
            <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("draft", "Saved as draft.")}>
              {busy === "draft" ? "Saving…" : "Move to draft"}
            </button>
          ) : null}
          <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("archived", "Listing deleted.")}>
            {busy === "archived" ? "Saving…" : "Delete"}
          </button>
        </>
      )}
      {moderate && !deleted ? (
        <>
          <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("rejected", "Listing rejected.")}>
            {busy === "rejected" ? "Saving…" : "Reject"}
          </button>
          <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run("suspended", "Listing suspended.")}>
            {busy === "suspended" ? "Saving…" : "Suspend"}
          </button>
        </>
      ) : null}
      <span className="sr-only">{shopProductListingLabel(status)}</span>
    </div>
  );
}
