"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, BadgeCheck, Sparkles } from "lucide-react";

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
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 lg:pt-14">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-goldink">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-goldink">Concierge</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">Ask NaijaSpa</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink2">
          Describe a treatment, city or budget. We search live listings. AI never confirms a booking or payment.
        </p>
      </div>

      <form
        className="mt-10"
        onSubmit={(ev) => {
          ev.preventDefault();
          send(q);
        }}
      >
        <label className="sr-only" htmlFor="ai-q">
          What you need
        </label>
        <div className="flex items-center gap-2 rounded-full border border-line bg-card p-2 shadow-sm">
          <input
            id="ai-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-12 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink2"
            placeholder="A deep tissue in Lekki, under ₦40,000…"
          />
          <button
            type="submit"
            disabled={busy || !q.trim()}
            aria-label="Search"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ongold disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>

      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((e) => (
          <li key={e}>
            <button
              type="button"
              className="rounded-full border border-line bg-card px-3.5 py-2 text-left text-xs font-medium text-ink2 transition hover:border-gold/50 hover:text-ink"
              onClick={() => send(e)}
            >
              {e}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-10 text-center text-sm text-ink2">
          {error}{" "}
          <Link className="font-semibold text-goldink" href="/explore">
            Open search
          </Link>
        </p>
      )}

      {data && (
        <div className="mt-12">
          {data.usedFallback && (
            <p className="mb-4 text-center text-xs text-ink2">Local parser · OpenAI not configured</p>
          )}
          {data.results.length === 0 ? (
            <p className="rounded-3xl border border-line bg-card px-5 py-8 text-center text-sm text-ink2">
              Nothing matched. Try a city or a looser budget.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.results.map((r) => (
                <li key={r.service.slug}>
                  <Link
                    href={`/services/${r.service.slug}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-card px-5 py-4 transition hover:border-gold/40"
                  >
                    <span>
                      <span className="block font-semibold">{r.service.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink2">
                        <span>{r.vendor.businessName}</span>
                        {r.vendor.city ? <span>· {r.vendor.city}</span> : null}
                        {r.vendor.verificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 text-leaf">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                            Verified
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-goldink">
                      ₦{(r.quote.customerTotalKobo / 100).toLocaleString()}
                    </span>
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
