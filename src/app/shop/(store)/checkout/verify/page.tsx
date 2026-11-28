import { headers } from "next/headers";
import { verifyPaystack } from "@/lib/payments";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";
import { rememberShopOrder } from "@/lib/shop/cart";
import { formatNgn } from "@/lib/money";
import { ToastOnMount } from "@/components/vendor/toasts";

export default async function ShopVerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const shopHost = shopHostFromHeaders(await headers());
  const href = (path: string) => shopPublicPath(`/shop${path}`, shopHost);
  let ok = false;
  let order: { id: string; number: string; totalKobo: number } | null = null;
  if (reference) {
    try {
      const payment = await verifyPaystack(reference);
      ok = payment.status === "success";
      if (payment.shopMasterOrderId) {
        await rememberShopOrder(payment.shopMasterOrderId);
        order = await prisma.shopMasterOrder.findUnique({
          where: { id: payment.shopMasterOrderId },
          select: { id: true, number: true, totalKobo: true }
        });
      }
    } catch {
      ok = false;
    }
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {ok ? <ToastOnMount kind="success" message="Payment received. Your order is confirmed." /> : null}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Checkout</p>
      <h1 className="mt-2 font-display text-4xl">{ok ? "Payment received" : "Payment pending"}</h1>
      <p className="mt-3 text-sm text-ink2">
        {ok
          ? "Your Shop order is confirmed. Each seller will dispatch separately. Keep your order number to track it — no account required."
          : "If you paid, wait a moment and refresh. If this stays pending, contact support with your Paystack reference."}
      </p>
      {order ? (
        <p className="mt-4 text-sm font-semibold">
          {order.number} · {formatNgn(order.totalKobo)}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={order ? href(`/orders/${order.id}`) : href("/orders")} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          View order
        </Link>
        <Link href={href("")} className="inline-flex min-h-11 items-center rounded-full border border-line px-6 text-sm font-semibold">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
