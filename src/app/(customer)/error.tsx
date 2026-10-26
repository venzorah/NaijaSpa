"use client";

import { useEffect } from "react";

export default function CustomerError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink2">Reload this page, or go back to Explore to pick another service.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
        >
          Try again
        </button>
        <a href="/explore" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">
          Explore
        </a>
      </div>
    </div>
  );
}
