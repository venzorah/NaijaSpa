"use client";

import Link from "next/link";
import { CalendarDays, Heart, RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-green.png" alt="" className="h-20 w-20 opacity-60 grayscale" />
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-gold text-ongold">
          <WifiOff className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold text-ink">You’re offline</h1>
      <p className="mt-2 text-sm text-ink2">
        No connection right now. Saved bookings and favourites on this device may still be available, and we’ll sync as
        soon as you’re back.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
      >
        <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
        Try again
      </button>
      <div className="mt-8 grid w-full grid-cols-2 gap-2">
        <Link
          href="/account/bookings"
          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-card text-sm font-semibold text-ink"
        >
          <CalendarDays className="h-5 w-5 text-leaf" aria-hidden />
          Saved bookings
        </Link>
        <Link
          href="/account/favourites"
          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-card text-sm font-semibold text-ink"
        >
          <Heart className="h-5 w-5 text-leaf" aria-hidden />
          Favourites
        </Link>
      </div>
    </div>
  );
}
