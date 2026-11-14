"use client";

import { useState } from "react";
import { Panel } from "@/components/admin/panel";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import type { RefundPolicy } from "@/lib/refund-policy";

function Switch({
  checked,
  disabled,
  onChange,
  label,
  hint
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex min-h-10 items-start justify-between gap-3 text-sm">
      <span>
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-ink2">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full ${checked ? "bg-leaf" : "bg-elev"} disabled:opacity-50`}
        onClick={onChange}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "right-0.5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function RefundPolicyConsole({ initial, canEdit }: { initial: RefundPolicy; canEdit: boolean }) {
  const [policy, setPolicy] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Panel
      title="Refund policy"
      description="Turn refund functions on or off, set the free-cancel window, and keep a penalty (fee) when a paid booking is cancelled late or marked no-show. Paystack sends money back to the customer’s original payment method."
    >
      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
      <form
        className="grid max-w-2xl gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canEdit) return;
          setBusy(true);
          setError("");
          try {
            const json = await adminJson<{ policy: RefundPolicy }>("/api/admin/refunds/policy", {
              method: "PUT",
              body: JSON.stringify({
                paystackRefundsEnabled: policy.paystackRefundsEnabled,
                adminRefundsEnabled: policy.adminRefundsEnabled,
                customerCancelEnabled: policy.customerCancelEnabled,
                autoRefundOnCancel: policy.autoRefundOnCancel,
                vendorCancelQueuesRefund: policy.vendorCancelQueuesRefund,
                freeCancelHours: policy.freeCancelHours,
                latePenaltyPercent: policy.latePenaltyBps / 100,
                noShowPenaltyPercent: policy.noShowPenaltyBps / 100,
                minRefundNaira: policy.minRefundKobo / 100
              })
            });
            setPolicy(json.policy);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save refund policy.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Switch
          checked={policy.adminRefundsEnabled}
          disabled={!canEdit}
          onChange={() => setPolicy((p) => ({ ...p, adminRefundsEnabled: !p.adminRefundsEnabled }))}
          label="Admin can send refunds"
          hint="Finance can queue refunds, set pending/completed by hand, or send through Paystack."
        />
        <Switch
          checked={policy.paystackRefundsEnabled}
          disabled={!canEdit}
          onChange={() => setPolicy((p) => ({ ...p, paystackRefundsEnabled: !p.paystackRefundsEnabled }))}
          label="Paystack refunds"
          hint="Master switch. Off = records stay in NaijaSpa; no money is sent to Paystack."
        />
        <Switch
          checked={policy.customerCancelEnabled}
          disabled={!canEdit}
          onChange={() => setPolicy((p) => ({ ...p, customerCancelEnabled: !p.customerCancelEnabled }))}
          label="Customers can cancel paid bookings"
          hint="Off = they must contact support. Unpaid checkout can still be dropped."
        />
        <Switch
          checked={policy.vendorCancelQueuesRefund}
          disabled={!canEdit}
          onChange={() => setPolicy((p) => ({ ...p, vendorCancelQueuesRefund: !p.vendorCancelQueuesRefund }))}
          label="Therapist cancel queues a refund"
          hint="When a therapist cancels a paid visit, Finance gets a refund to review."
        />
        <Switch
          checked={policy.autoRefundOnCancel}
          disabled={!canEdit}
          onChange={() => setPolicy((p) => ({ ...p, autoRefundOnCancel: !p.autoRefundOnCancel }))}
          label="Send refunds automatically"
          hint="On = Paystack is called as soon as a paid booking is cancelled, using the penalties below. Off = admin must press Refund on Paystack."
        />
        <FormRow label="Free cancellation window (hours before start)" htmlFor="free-hours">
          <input
            id="free-hours"
            type="number"
            min={0}
            max={720}
            disabled={!canEdit}
            className={adminField}
            value={policy.freeCancelHours}
            onChange={(e) => setPolicy((p) => ({ ...p, freeCancelHours: Number(e.target.value) }))}
          />
        </FormRow>
        <FormRow
          label="Late cancel penalty (%)"
          htmlFor="late-penalty"
          hint="Kept by NaijaSpa if cancelled after the free window but before the appointment. 50 means the customer gets half back."
        >
          <input
            id="late-penalty"
            type="number"
            min={0}
            max={100}
            disabled={!canEdit}
            className={adminField}
            value={policy.latePenaltyBps / 100}
            onChange={(e) => setPolicy((p) => ({ ...p, latePenaltyBps: Math.round(Number(e.target.value) * 100) }))}
          />
        </FormRow>
        <FormRow
          label="No-show penalty (%)"
          htmlFor="noshow-penalty"
          hint="100 means no refund when the visit is missed or cancelled after start time."
        >
          <input
            id="noshow-penalty"
            type="number"
            min={0}
            max={100}
            disabled={!canEdit}
            className={adminField}
            value={policy.noShowPenaltyBps / 100}
            onChange={(e) => setPolicy((p) => ({ ...p, noShowPenaltyBps: Math.round(Number(e.target.value) * 100) }))}
          />
        </FormRow>
        <FormRow label="Minimum refund (₦)" htmlFor="min-refund" hint="Smaller quotes are treated as ₦0 so Paystack is not called for tiny amounts.">
          <input
            id="min-refund"
            type="number"
            min={0}
            disabled={!canEdit}
            className={adminField}
            value={policy.minRefundKobo / 100}
            onChange={(e) => setPolicy((p) => ({ ...p, minRefundKobo: Math.round(Number(e.target.value) * 100) }))}
          />
        </FormRow>
        {canEdit ? (
          <button className={adminBtn} disabled={busy}>
            {busy ? "Saving…" : "Save refund policy"}
          </button>
        ) : (
          <p className="text-sm text-ink2">View only.</p>
        )}
      </form>
    </Panel>
  );
}
