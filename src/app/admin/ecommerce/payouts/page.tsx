import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { ShopPayoutButton } from "@/components/admin/shop-payout-button";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommercePayoutsPage() {
  const settlements = await shopQuery(
    () =>
      prisma.shopSettlement.findMany({
        include: { vendor: { select: { id: true, businessName: true } } },
        orderBy: { createdAt: "desc" },
        take: 200
      }),
    []
  );
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Money</p>
      <h1 className="mt-1 font-display text-3xl">Settlements and payouts</h1>
      <p className="mt-2 text-sm text-ink2">Ledger-only payouts. This is not Paystack Transfers and not VendorEarning.</p>
      <ul className="mt-6 space-y-3">
        {settlements.map((s) => (
          <li key={s.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{s.vendor.businessName} · {formatNgn(s.amountKobo)}</p>
            <p className="text-sm text-ink2">{s.status} · available {s.availableAt.toISOString().slice(0, 10)}</p>
            {s.status !== "paid" ? <ShopPayoutButton vendorId={s.vendor.id} /> : null}
          </li>
        ))}
        {!settlements.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No settlements yet.</li> : null}
      </ul>
    </div>
  );
}
