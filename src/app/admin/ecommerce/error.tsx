"use client";

export default function EcommerceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Shop admin</p>
      <h1 className="mt-1 font-display text-3xl">This screen could not load</h1>
      <p className="mt-2 text-sm text-ink2">{error.message || "Try again. Your other Shop admin pages stay available in the menu."}</p>
      <button type="button" onClick={() => reset()} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
        Try again
      </button>
    </div>
  );
}
