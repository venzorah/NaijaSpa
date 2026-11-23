import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { ShopPayoutButton } from "@/components/admin/shop-payout-button";

export default async function EcommercePayoutsPage() {
  const settlements = await prisma.shopSettlement.findMany({
    include: { vendor: { select: { id: true, businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return (
    <div>
      <h1 className="font-display text-3xl">Settlements and payouts</h1>
      <ul className="mt-6 space-y-3">
        {settlements.map((s) => (
          <li key={s.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{s.vendor.businessName} · {formatNgn(s.amountKobo)}</p>
            <p className="text-sm text-ink2">{s.status} · available {s.availableAt.toISOString().slice(0, 10)}</p>
            {s.status !== "paid" ? <ShopPayoutButton vendorId={s.vendor.id} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
