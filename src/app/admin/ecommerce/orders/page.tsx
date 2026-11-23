import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function EcommerceOrdersPage() {
  const orders = await prisma.shopMasterOrder.findMany({
    include: { vendorOrders: { include: { vendor: { select: { businessName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return (
    <div>
      <h1 className="font-display text-3xl">Product orders</h1>
      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{o.number} · {formatNgn(o.totalKobo)}</p>
            <p className="text-sm text-ink2">{o.status} · {o.city}, {o.state}</p>
            {o.vendorOrders.map((vo) => (
              <p key={vo.id} className="text-xs text-ink2">{vo.number} {vo.vendor.businessName} {vo.status}</p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
