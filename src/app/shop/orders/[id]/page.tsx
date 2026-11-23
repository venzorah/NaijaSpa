import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { OrderReturnForm } from "@/components/shop/return-form";
import { shopQuery } from "@/lib/shop/safe-query";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import Link from "next/link";

export default async function ShopOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const user = await getSession();
  if (!user) redirect(`${href("/login")}?${new URLSearchParams({ next: href("/orders") })}`);
  const { id } = await params;
  const order = await shopQuery(
    () =>
      prisma.shopMasterOrder.findFirst({
        where: { id, userId: user.id },
        include: { vendorOrders: { include: { items: true, vendor: { select: { businessName: true } } } } }
      }),
    null
  );
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <Link href={href("/orders")} className="text-sm font-semibold text-goldink">
        ← All Shop orders
      </Link>
      <h1 className="mt-3 font-display text-4xl">{order.number}</h1>
      <p className="mt-2 text-sm text-ink2">{order.status} · {formatNgn(order.totalKobo)}</p>
      <p className="mt-1 text-sm">{order.address}, {order.city}, {order.state}</p>
      <div className="mt-6 space-y-4">
        {order.vendorOrders.map((vo) => (
          <section key={vo.id} className="rounded-[1.75rem] border border-line bg-card p-5">
            <h2 className="font-semibold">{vo.number} · {vo.vendor.businessName}</h2>
            <p className="text-sm text-ink2">{vo.status}{vo.tracking ? ` · Tracking ${vo.tracking}` : ""}</p>
            <ul className="mt-2 text-sm">
              {vo.items.map((item) => (
                <li key={item.id}>{item.nameSnapshot} × {item.quantity} · {formatNgn(item.lineKobo)}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Items {formatNgn(vo.productKobo)} · Shipping {formatNgn(vo.shippingKobo)}</p>
            {order.status === "paid" ? <OrderReturnForm vendorOrderId={vo.id} /> : null}
          </section>
        ))}
      </div>
    </div>
  );
}
