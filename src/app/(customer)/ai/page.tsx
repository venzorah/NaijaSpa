"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";
import { ExploreResultCard, type ExploreResult } from "@/components/explore-result-card";

type Result = {
  usedFallback: boolean;
  filters: Record<string, unknown>;
  results: ExploreResult[];
};

const EXAMPLES = [
  "Nuru massage",
  "Treatments in Ikeja",
  "Couples treatments",
  "A highly rated spa in Lekki under ₦30,000",
  "Home service in Lagos"
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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 lg:px-8 lg:pt-14">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-goldink">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-goldink">Concierge</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">Ask NaijaSpa</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink2">
          Describe a treatment, city or budget. We search every live listing on the site. AI never confirms a booking or
          payment.
        </p>
      </div>

      <form
        className="mx-auto mt-10 max-w-2xl"
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
            placeholder="Nuru in Lekki, couples in Lagos, Ikeja facials…"
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

      <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
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
              Nothing on NaijaSpa matched that request.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.results.map((r) => (
                <li key={r.service.slug}>
                  <ExploreResultCard result={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
