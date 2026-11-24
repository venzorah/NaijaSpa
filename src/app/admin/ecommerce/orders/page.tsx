import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { ShopAdminError } from "@/components/admin/shop-admin-error";
import { adminShopLoad } from "@/lib/shop/admin-load";

export default async function EcommerceOrdersPage() {
  const loaded = await adminShopLoad(() =>
    prisma.shopMasterOrder.findMany({
      include: { vendorOrders: { include: { vendor: { select: { businessName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  );
  if (!loaded.ok) {
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Orders</p>
        <h1 className="mt-1 font-display text-3xl">Product orders</h1>
        <ShopAdminError message={loaded.error} />
      </div>
    );
  }
  const orders = loaded.data;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Orders</p>
      <h1 className="mt-1 font-display text-3xl">Product orders</h1>
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
        {!orders.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No Shop orders yet.</li> : null}
      </ul>
    </div>
  );
}
