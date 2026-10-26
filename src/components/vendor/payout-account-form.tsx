"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";

type Bank = { code: string; name: string };
type Account = {
  bankCode: string | null;
  bankName: string | null;
  accountNumberMasked: string;
  accountName: string | null;
  ready: boolean;
};

export function PayoutAccountForm() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/vendor/payout-account")
      .then((r) => r.json())
      .then((j) => {
        setBanks(j.banks || []);
        setAccount(j.account || null);
        setBankCode(j.account?.bankCode || "");
      })
      .catch(() => setMessage("Could not load payout banks."));
  }, []);

  async function submit(verifyOnly: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/vendor/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber, verifyOnly })
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "Could not verify that account.");
        return;
      }
      if (verifyOnly) {
        setResolvedName(json.accountName || "");
        setMessage(json.accountName ? `Account name: ${json.accountName}` : "Account number looks valid.");
        return;
      }
      setAccount(json.account);
      setResolvedName(json.account?.accountName || "");
      setAccountNumber("");
      setMessage("Payouts will now go to this verified account after a visit is confirmed.");
    } catch {
      setMessage("Could not save account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Payout account" className="mt-4">
      <p className="text-sm text-ink2">
        After a customer or you confirm the visit, NaijaSpa sends the vendor share to this Nigerian bank account by Paystack Transfer. Commission stays with NaijaSpa.
      </p>
      {account?.bankName || account?.accountName ? (
        <p className="mt-3 text-sm text-ink">
          {account.accountName ? <strong>{account.accountName}</strong> : null}
          {account.accountName ? " · " : null}
          {account.bankName} {account.accountNumberMasked}
          {account.ready ? " · connected to Paystack" : " · saved, Paystack recipient pending"}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink2">No payout account yet. Verify a 10-digit NUBAN so confirmed bookings can pay you.</p>
      )}
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <FormRow label="Bank" htmlFor="payout-bank">
          <select id="payout-bank" className={adminField} value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
            <option value="">Select bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Account number" htmlFor="payout-nuban">
          <input
            id="payout-nuban"
            className={adminField}
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit NUBAN"
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
              setResolvedName("");
            }}
            required
          />
        </FormRow>
        {resolvedName ? <p className="sm:col-span-2 text-sm font-semibold text-ink">Pays {resolvedName}</p> : null}
        <button type="button" className={`${adminBtn} bg-elev text-ink`} disabled={busy} onClick={() => void submit(true)}>
          {busy ? "Checking…" : "Verify account"}
        </button>
        <button type="submit" className={adminBtn} disabled={busy}>
          {busy ? "Saving…" : "Save payout account"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-ink2">{message}</p> : null}
    </Panel>
  );
}
