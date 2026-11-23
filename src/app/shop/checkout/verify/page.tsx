import { headers } from "next/headers";
import { verifyPaystack } from "@/lib/payments";
import Link from "next/link";
import { shopHostFromHeaders, shopPublicPath } from "@/lib/shop-host";

export default async function ShopVerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const shopHost = shopHostFromHeaders(await headers());
  const ordersHref = shopPublicPath("/shop/orders", shopHost);
  const shopHref = shopPublicPath("/shop", shopHost);
  let ok = false;
  if (reference) {
    try {
      const payment = await verifyPaystack(reference);
      ok = payment.status === "success";
    } catch {
      ok = false;
    }
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Checkout</p>
      <h1 className="mt-2 font-display text-4xl">{ok ? "Payment received" : "Payment pending"}</h1>
      <p className="mt-3 text-sm text-ink2">
        {ok
          ? "Your Shop order is confirmed. Each seller will dispatch separately."
          : "If you paid, wait a moment and refresh. If this stays pending, contact support with your Paystack reference."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={ordersHref} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          View orders
        </Link>
        <Link href={shopHref} className="inline-flex min-h-11 items-center rounded-full border border-line px-6 text-sm font-semibold">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
