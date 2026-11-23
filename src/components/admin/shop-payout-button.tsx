"use client";

export function ShopPayoutButton({ vendorId }: { vendorId: string }) {
  return (
    <button
      type="button"
      className="mt-2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold"
      onClick={async () => {
        await fetch("/api/admin/shop/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId }) });
        location.reload();
      }}
    >
      Pay available balance
    </button>
  );
}
