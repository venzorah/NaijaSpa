import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import Link from "next/link";
import { shopQuery } from "@/lib/shop/safe-query";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function ShopOrdersPage() {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const user = await getSession();
  if (!user) redirect(`${href("/login")}?${new URLSearchParams({ next: href("/orders") })}`);
  const orders = await shopQuery(
    () =>
      prisma.shopMasterOrder.findMany({
        where: { userId: user.id },
        include: { vendorOrders: { include: { vendor: { select: { businessName: true } } } } },
        orderBy: { createdAt: "desc" }
      }),
    []
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Account</p>
      <h1 className="mt-1 font-display text-4xl">Your Shop orders</h1>
      {orders.length ? (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={href(`/orders/${o.id}`)} className="block rounded-[1.75rem] border border-line bg-card p-5">
              <p className="font-semibold">{o.number}</p>
              <p className="text-sm text-ink2">
                {o.status} · {formatNgn(o.totalKobo)} · {o.vendorOrders.length} seller shipment{o.vendorOrders.length === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <ShopEmptyState title="No product orders yet" body="When you pay for oils, soaps or tools, tracking lives here — separate from spa bookings." href={href("/search")} cta="Browse products" />
      )}
    </div>
  );
}
