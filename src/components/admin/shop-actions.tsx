"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAction } from "@/lib/action-feedback";

function ShopActionButtons({
  onAction
}: {
  onAction: (status: "approved" | "rejected" | "suspended") => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function run(status: "approved" | "rejected" | "suspended") {
    if (busy) return;
    setBusy(status);
    setError("");
    try {
      await onAction(status);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Action failed.";
      setError(text);
      notifyAction("error", text);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold disabled:opacity-60" onClick={() => void run("approved")}>
          {busy === "approved" ? "Saving…" : "Approve"}
        </button>
        <button type="button" disabled={Boolean(busy)} className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-60" onClick={() => void run("rejected")}>
          {busy === "rejected" ? "Saving…" : "Reject"}
        </button>
        <button type="button" disabled={Boolean(busy)} className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-60" onClick={() => void run("suspended")}>
          {busy === "suspended" ? "Saving…" : "Suspend"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

async function patchJson(url: string, body: object) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Could not update.");
}

export function ShopVendorActions({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function run(status: "approved" | "rejected" | "suspended", approveProducts = false) {
    if (busy) return;
    setBusy(status + (approveProducts ? "-all" : ""));
    setError("");
    try {
      await patchJson("/api/shop/vendor/apply", { vendorId, status, approveProducts });
      notifyAction("success", approveProducts ? "Store and pending products approved." : `Shop ${status}.`);
      router.refresh();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Action failed.";
      setError(text);
      notifyAction("error", text);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold disabled:opacity-60" onClick={() => void run("approved")}>
          {busy === "approved" ? "Saving…" : "Approve store"}
        </button>
        <button type="button" disabled={Boolean(busy)} className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-goldink disabled:opacity-60" onClick={() => void run("approved", true)}>
          {busy === "approved-all" ? "Saving…" : "Approve store & products"}
        </button>
        <button type="button" disabled={Boolean(busy)} className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-60" onClick={() => void run("rejected")}>
          {busy === "rejected" ? "Saving…" : "Reject"}
        </button>
        <button type="button" disabled={Boolean(busy)} className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-60" onClick={() => void run("suspended")}>
          {busy === "suspended" ? "Saving…" : "Suspend"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ShopProductActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ShopActionButtons
      onAction={async (status) => {
        await patchJson("/api/admin/shop/products", { id, status });
        notifyAction("success", `Product ${status}.`);
        router.refresh();
      }}
    />
  );
}
