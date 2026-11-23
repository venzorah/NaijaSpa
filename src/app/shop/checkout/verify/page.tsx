import { verifyPaystack } from "@/lib/payments";
import Link from "next/link";

export default async function ShopVerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
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
      <h1 className="font-display text-3xl">{ok ? "Payment received" : "Payment pending"}</h1>
      <p className="mt-3 text-sm text-ink2">{ok ? "Your Shop order is confirmed. Each seller will dispatch separately." : "If you paid, wait a moment and refresh. If this stays pending, contact support with your reference."}</p>
      <Link href="/orders" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">View orders</Link>
    </div>
  );
}
