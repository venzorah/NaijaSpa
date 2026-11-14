"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { formatNgn } from "@/lib/money";
import { cn } from "@/lib/cn";
import { REFUND_STATUS_OPTIONS, refundStatusLabel } from "@/lib/refund-policy";

type Tab = "transactions" | "refunds" | "earnings" | "payouts";

export function FinanceConsole({
  payments,
  refunds,
  earnings,
  payouts,
  editable
}: {
  payments: { id: string; reference: string; purpose: string; status: string; amountKobo: number; createdAt: string }[];
  refunds: {
    id: string;
    amountKobo: number;
    penaltyKobo: number;
    status: string;
    reason: string | null;
    createdAt: string;
    paymentRef: string;
    bookingId: string | null;
    bookingRef: string | null;
  }[];
  earnings: { id: string; vendor: string; payableKobo: number; commissionKobo: number; status: string }[];
  payouts: { id: string; vendor: string; amountKobo: number; status: string; note: string | null; createdAt: string }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("transactions");
  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "refunds", label: "Refunds" },
    { id: "earnings", label: "Vendor earnings" },
    { id: "payouts", label: "Payouts" }
  ];
  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-elev p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === t.id ? "bg-card ring-1 ring-gold/30" : "text-ink2")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "transactions" ? (
        <Panel title="Payments" description="Paystack rows including initialized" bodyClassName="p-0">
          <Rows
            items={payments.map((p) => ({
              id: p.id,
              title: p.reference,
              sub: `${p.purpose} · ${p.createdAt}`,
              amount: p.amountKobo,
              status: p.status
            }))}
          />
        </Panel>
      ) : null}
      {tab === "refunds" ? (
        <Panel title="Refunds" description="Refunds can stay manual: set pending or completed after you pay the customer yourself. Paystack is optional.">
          {refunds.length ? (
            <ul className="space-y-3">
              {refunds.map((r) => (
                <RefundRow key={r.id} refund={r} editable={editable} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink2">No refunds queued yet.</p>
          )}
        </Panel>
      ) : null}
      {tab === "earnings" ? (
        <Panel title="Vendor earnings" bodyClassName="p-0">
          <Rows
            items={earnings.map((e) => ({
              id: e.id,
              title: e.vendor,
              sub: `Commission ${formatNgn(e.commissionKobo)}`,
              amount: e.payableKobo,
              status: e.status
            }))}
          />
        </Panel>
      ) : null}
      {tab === "payouts" ? (
        <Panel title="Payouts">
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{p.vendor}</p>
                  <p className="text-[11px] text-ink2">
                    {p.createdAt} {p.note ? `· ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold">{formatNgn(p.amountKobo)}</span>
                  <AdminStatusPill status={p.status} />
                  {p.status === "manual" ? (
                    <ConfirmAction
                      triggerLabel="Mark paid"
                      triggerVariant="default"
                      disabled={!editable}
                      title="Release this payout?"
                      description="Marks the payout as paid. Use this after the bank transfer has gone out."
                      confirmLabel="Mark paid"
                      onConfirm={async () => {
                        await adminJson(`/api/admin/payouts/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: "paid" }) });
                        router.refresh();
                      }}
                    />
                  ) : null}
                  {["submitting", "pending", "otp"].includes(p.status) ? <TransferApproval id={p.id} needsOtp={p.status === "otp"} disabled={!editable} /> : null}
                  {["failed", "needs_account", "below_minimum"].includes(p.status) ? (
                    <ConfirmAction
                      triggerLabel="Retry transfer"
                      triggerVariant="outline"
                      disabled={!editable}
                      title="Retry Paystack transfer?"
                      description="Sends this earning again to the vendor’s saved bank account."
                      confirmLabel="Retry"
                      onConfirm={async () => {
                        await adminJson(`/api/admin/payouts/${p.id}`, { method: "PATCH", body: JSON.stringify({ retry: true }) });
                        router.refresh();
                      }}
                    />
                  ) : null}
                </div>
              </li>
            ))}
            {payouts.length === 0 ? <p className="text-sm text-ink2">No payouts yet.</p> : null}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function RefundRow({
  refund,
  editable
}: {
  refund: {
    id: string;
    amountKobo: number;
    penaltyKobo: number;
    status: string;
    reason: string | null;
    createdAt: string;
    paymentRef: string;
    bookingId: string | null;
    bookingRef: string | null;
  };
  editable: boolean;
}) {
  const router = useRouter();
  const [amountNaira, setAmountNaira] = useState(String(refund.amountKobo / 100));
  const [status, setStatus] = useState(refundStatusLabel(refund.status));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setAmountNaira(String(refund.amountKobo / 100));
    setStatus(refundStatusLabel(refund.status));
  }, [refund.amountKobo, refund.status]);
  async function saveStatus() {
    setBusy(true);
    setError("");
    try {
      const amountKobo = Math.round(Number(amountNaira) * 100);
      if (!Number.isFinite(amountKobo) || amountKobo < 0) throw new Error("Enter a valid refund amount.");
      await adminJson(`/api/admin/refunds/${refund.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "status",
          status,
          amountKobo
        })
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this refund.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="rounded-xl border border-line p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{refund.bookingRef || "Booking refund"}</p>
          <p className="text-[11px] text-ink2">
            {refund.paymentRef} · penalty {formatNgn(refund.penaltyKobo)} · {refund.createdAt}
          </p>
          {refund.reason ? <p className="mt-1 text-xs text-ink2">{refund.reason}</p> : null}
        </div>
        <AdminStatusPill status={refundStatusLabel(refund.status)} />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-ink2">
          Refund ₦
          <input
            type="number"
            min={0}
            value={amountNaira}
            disabled={!editable}
            onChange={(e) => setAmountNaira(e.target.value)}
            className="ml-1 w-28 rounded border border-line bg-card px-2 py-1 text-sm text-ink"
          />
        </label>
        <label className="text-[11px] text-ink2">
          Status
          <select
            value={status}
            disabled={!editable}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-1 rounded border border-line bg-card px-2 py-1 text-sm text-ink"
          >
            {REFUND_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!editable || busy}
          className="rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ongold disabled:opacity-50"
          onClick={() => void saveStatus()}
        >
          {busy ? "Saving…" : "Save status"}
        </button>
        {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
        <ConfirmAction
          triggerLabel="Refund on Paystack"
          disabled={!editable}
          title="Send this refund through Paystack?"
          description="Optional. Use this only if you want Paystack to credit the original card or transfer. For a bank transfer or cash, set status to Completed instead."
          confirmLabel="Send via Paystack"
          requireReason
          onConfirm={async (reason) => {
            await adminJson(`/api/admin/refunds/${refund.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                action: "send",
                amountKobo: Math.round(Number(amountNaira) * 100),
                reason
              })
            });
            router.refresh();
          }}
        />
      </div>
    </li>
  );
}

function TransferApproval({ id, needsOtp, disabled }: { id: string; needsOtp: boolean; disabled: boolean }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(confirm: boolean) {
    setBusy(true); setError("");
    try {
      await adminJson(`/api/admin/payouts/${id}`, { method: "PATCH", body: JSON.stringify(confirm ? { otp } : { refresh: true }) });
      setOtp(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Transfer verification failed"); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    {needsOtp ? <>
      <input aria-label="Paystack transfer OTP" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-24 rounded border border-line bg-card px-2 py-1" placeholder="OTP" disabled={disabled || busy} />
      <button type="button" disabled={disabled || busy || otp.length !== 6} onClick={() => submit(true)} className="rounded border border-line px-2 py-1 disabled:opacity-50">Confirm OTP</button>
    </> : null}
    <button type="button" disabled={disabled || busy} onClick={() => submit(false)} className="rounded border border-line px-2 py-1 disabled:opacity-50">Verify transfer</button>
    {error ? <p role="alert" className="w-full text-xs text-red-600">{error}</p> : null}
  </div>;
}

function Rows({ items }: { items: { id: string; title: string; sub: string; amount: number; status: string }[] }) {
  if (!items.length) return <p className="px-4 py-8 text-sm text-ink2">Nothing in this ledger yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">{item.title}</p>
            <p className="text-[11px] text-ink2">{item.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-semibold">{formatNgn(item.amount)}</span>
            <AdminStatusPill status={item.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
