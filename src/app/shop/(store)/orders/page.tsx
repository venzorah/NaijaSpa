import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { formatNgn } from "@/lib/money";
import Link from "next/link";
import { shopQuery } from "@/lib/shop/safe-query";
import { ShopEmptyState } from "@/components/shop/empty-state";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { shopOrdersForBuyer } from "@/lib/shop/order-access";
import { FindShopOrderForm } from "@/components/shop/find-order-form";

export default async function ShopOrdersPage() {
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  const user = await getSession();
  const orders = await shopQuery(() => shopOrdersForBuyer(user?.id), []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Orders</p>
      <h1 className="mt-1 font-display text-4xl">Your Shop orders</h1>
      <p className="mt-2 text-sm text-ink2">You can buy without an account. Sign in only if you want orders saved to a NaijaSpa profile.</p>
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
        <ShopEmptyState title="No product orders yet" body="Pay for oils, soaps or tools with Paystack — no account required. Tracking appears here after payment." href={href("/search")} cta="Browse products" />
      )}
      <FindShopOrderForm />
    </div>
  );
}
