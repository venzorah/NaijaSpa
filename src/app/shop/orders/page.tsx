import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import Link from "next/link";

export default async function ShopOrdersPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/orders");
  const orders = await prisma.shopMasterOrder.findMany({
    where: { userId: user.id },
    include: { vendorOrders: { include: { vendor: { select: { businessName: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="font-display text-3xl">Your Shop orders</h1>
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-3xl border border-line bg-card p-5">
            <p className="font-semibold">{o.number}</p>
            <p className="text-sm text-ink2">{o.status} · {formatNgn(o.totalKobo)} · {o.vendorOrders.length} seller shipment{o.vendorOrders.length === 1 ? "" : "s"}</p>
          </Link>
        ))}
        {!orders.length ? <p className="text-sm text-ink2">No product orders yet.</p> : null}
      </div>
    </div>
  );
}
