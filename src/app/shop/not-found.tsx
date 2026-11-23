import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Shop</p>
      <h1 className="mt-2 font-display text-4xl">We could not find that page</h1>
      <p className="mt-3 text-sm text-ink2">The product or store may be awaiting approval, or the link is out of date.</p>
      <Link href="/shop" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
        Back to Shop
      </Link>
    </div>
  );
}
