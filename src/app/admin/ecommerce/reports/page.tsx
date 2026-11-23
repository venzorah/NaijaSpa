import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function EcommerceReportsPage() {
  const paid = await prisma.shopMasterOrder.aggregate({ where: { status: "paid" }, _sum: { totalKobo: true, productKobo: true, shippingKobo: true }, _count: true });
  return (
    <div>
      <h1 className="font-display text-3xl">Ecommerce reports</h1>
      <p className="mt-4">Paid orders {paid._count} · GMV {formatNgn(paid._sum.totalKobo ?? 0)}</p>
      <p className="text-sm text-ink2">Products {formatNgn(paid._sum.productKobo ?? 0)} · Shipping {formatNgn(paid._sum.shippingKobo ?? 0)}</p>
    </div>
  );
}
