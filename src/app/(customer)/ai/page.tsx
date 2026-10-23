"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";

type Result = {
  usedFallback: boolean;
  filters: Record<string, unknown>;
  results: Array<{
    service: { slug: string; name: string };
    vendor: { businessName: string; city: string; publicPhone: string | null; publicWhatsapp: string | null; verificationStatus: string };
    quote: { basePriceKobo: number; surchargeKobo: number; customerTotalKobo: number };
  }>;
};

const EXAMPLES = [
  "A highly rated spa in Lekki under ₦30,000",
  "Couples treatments in Abuja",
  "Home service in Lagos",
  "Providers with public WhatsApp"
];

export default function AskAiPage() {
  const [q, setQ] = useState("");
  const [prior, setPrior] = useState<Record<string, unknown>>({});
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, prior })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Search failed. Traditional search is still available.");
        return;
      }
      setData(json);
      setPrior(json.filters);
      setQ("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col px-4 py-16">
      <div className="flex flex-1 flex-col items-center text-center">
        <Sparkles className="h-5 w-5 text-goldink" aria-hidden />
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Ask NaijaSpa</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink2">
          Describe a treatment, city or budget. We search live listings. AI never confirms a booking or payment.
        </p>

        <form
          className="mt-10 w-full"
          onSubmit={(ev) => {
            ev.preventDefault();
            send(q);
          }}
        >
          <label className="sr-only" htmlFor="ai-q">
            What do you need
          </label>
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-2 py-1.5">
            <input
              id="ai-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="min-h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-ink2"
              placeholder="A deep tissue in Lekki, under ₦40,000…"
            />
            <button
              type="submit"
              disabled={busy || !q.trim()}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ongold disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>

        <ul className="mt-8 w-full space-y-2 text-left">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <button
                type="button"
                className="w-full rounded-xl px-1 py-2 text-left text-sm text-ink2 transition hover:text-ink"
                onClick={() => send(e)}
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="mt-10 text-center text-sm text-ink2">
          {error}{" "}
          <Link className="text-goldink" href="/explore">
            Open search
          </Link>
        </p>
      )}

      {data && (
        <div className="mt-12 border-t border-line pt-8 text-left">
          {data.usedFallback && <p className="mb-6 text-center text-xs text-ink2">Local parser · OpenAI not configured</p>}
          {data.results.length === 0 ? (
            <p className="text-center text-sm text-ink2">Nothing matched. Try a city or a looser budget.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.results.map((r) => (
                <li key={r.service.slug}>
                  <Link href={`/services/${r.service.slug}`} className="flex items-baseline justify-between gap-4 py-4">
                    <span>
                      <span className="block font-medium">{r.service.name}</span>
                      <span className="mt-0.5 block text-xs text-ink2">
                        {r.vendor.businessName}
                        {r.vendor.city ? ` · ${r.vendor.city}` : ""}
                        {r.vendor.verificationStatus === "verified" ? " · Verified" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-goldink">₦{(r.quote.customerTotalKobo / 100).toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
