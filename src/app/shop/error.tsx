"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ShopError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Shop</p>
      <h1 className="mt-2 font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-ink2">Try again, or keep browsing the catalog.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          Try again
        </button>
        <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full border border-line px-6 text-sm font-semibold">
          Shop home
        </Link>
      </div>
    </div>
  );
}
