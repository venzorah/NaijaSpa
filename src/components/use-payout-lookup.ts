"use client";

import { useEffect, useState } from "react";

export function usePayoutLookup(bankCode: string, accountNumber: string) {
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nuban = accountNumber.replace(/\D/g, "").slice(0, 10);
    if (nuban.length !== 10 || !bankCode) {
      setAccountName("");
      setError("");
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/vendor/payout-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankCode, accountNumber: nuban, verifyOnly: true }),
          signal: ac.signal
        });
        const json = (await res.json()) as { accountName?: string; error?: string };
        if (!res.ok) {
          setAccountName("");
          setError(json.error || "Could not match that account.");
          return;
        }
        setAccountName(json.accountName || "");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setAccountName("");
        setError("Could not look up that account.");
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [bankCode, accountNumber]);

  return { accountName, error, loading };
}
