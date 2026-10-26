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

  return (
    <Panel title="Payout account" className="mt-4">
      <p className="text-sm text-ink2">
        Money from a confirmed visit is sent here automatically (Paystack Transfer). NaijaSpa keeps commission. Enable
        Transfers on your Paystack dashboard.
      </p>
      {account?.ready ? (
        <p className="mt-3 text-sm text-ink">
          {account.accountName ? <strong>{account.accountName}</strong> : null}
          {account.accountName ? " · " : null}
          {account.bankName} {account.accountNumberMasked}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink2">No payout account yet. Add a Nigerian NUBAN to get paid after the customer or you confirm the visit.</p>
      )}
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const res = await fetch("/api/vendor/payout-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bankCode, accountNumber })
            });
            const json = await res.json();
            if (!res.ok) setMessage(json.error || "Could not save account.");
            else {
              setAccount(json.account);
              setAccountNumber("");
              setMessage("Payout account saved.");
            }
          } catch {
            setMessage("Could not save account.");
          } finally {
            setBusy(false);
          }
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
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            required
          />
        </FormRow>
        <button type="submit" className={`${adminBtn} sm:col-span-2`} disabled={busy}>
          {busy ? "Saving…" : "Save payout account"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-ink2">{message}</p> : null}
    </Panel>
  );
}
