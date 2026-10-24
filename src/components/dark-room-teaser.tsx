"use client";

import { useState } from "react";

export function DarkRoomTeaser() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full max-w-xs rounded-2xl border border-line bg-card px-4 py-3 text-left transition hover:border-gold/50"
        aria-expanded={open}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink2">18+</p>
        <p className="mt-1 text-sm font-semibold tracking-wide">DARK ROOM +18</p>
        {open ? (
          <p className="mt-2 text-sm font-bold text-goldink">Coming soon!</p>
        ) : (
          <p className="mt-1 text-xs text-ink2">Tap for more</p>
        )}
      </button>
    </section>
  );
}
