import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommerceReportsPage() {
  const paid = await shopQuery(
    () => prisma.shopMasterOrder.aggregate({ where: { status: "paid" }, _sum: { totalKobo: true, productKobo: true, shippingKobo: true }, _count: true }),
    { _count: 0, _sum: { totalKobo: 0, productKobo: 0, shippingKobo: 0 } }
  );
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Insight</p>
      <h1 className="mt-1 font-display text-3xl">Ecommerce reports</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="text-sm text-ink2">Paid orders</p>
          <p className="mt-2 font-display text-3xl">{paid._count}</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="text-sm text-ink2">GMV</p>
          <p className="mt-2 font-display text-3xl">{formatNgn(paid._sum.totalKobo ?? 0)}</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="text-sm text-ink2">Shipping collected</p>
          <p className="mt-2 font-display text-3xl">{formatNgn(paid._sum.shippingKobo ?? 0)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-ink2">Products {formatNgn(paid._sum.productKobo ?? 0)}. Commission is on discounted product subtotal, not shipping.</p>
    </div>
  );
}
