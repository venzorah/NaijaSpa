"use client";

import { useState } from "react";
import Link from "next/link";

type Result = {
  usedFallback: boolean;
  filters: Record<string, unknown>;
  results: Array<{
    service: { slug: string; name: string };
    vendor: { businessName: string; city: string; publicPhone: string | null; publicWhatsapp: string | null; verificationStatus: string };
    quote: { basePriceKobo: number; surchargeKobo: number; customerTotalKobo: number };
  }>;
};

export default function AskAiPage() {
  const [q, setQ] = useState("");
  const [prior, setPrior] = useState<Record<string, unknown>>({});
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const examples = [
    "Find a highly rated spa in Lekki under ₦30,000.",
    "Show couples' treatments in Abuja.",
    "Find therapists available for home service in Lagos.",
    "Show providers with public WhatsApp contact."
  ];

  async function send(message: string) {
    setError("");
    const res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, prior })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Search failed. Traditional search is still available.");
      return;
    }
    setData(json);
    setPrior(json.filters);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl">Ask NaijaSpa AI</h1>
      <p className="mt-2 text-sm text-ink2">Natural-language search over real providers. AI never confirms bookings or payments.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((e) => (
          <button key={e} type="button" className="rounded-full border border-line px-3 py-1.5 text-left text-xs" onClick={() => send(e)}>
            {e}
          </button>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          send(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} className="min-h-12 flex-1 rounded-2xl border border-line bg-card px-4" placeholder="Describe what you need" />
        <button className="rounded-full bg-gold px-5 font-bold text-ongold">Ask</button>
      </form>
      {error && (
        <p className="mt-4 text-sm">
          {error} <Link className="underline" href="/explore">Open traditional search</Link>
        </p>
      )}
      {data && (
        <div className="mt-6 space-y-3">
          {data.usedFallback && <p className="text-xs text-ink2">Using the local query parser (OpenAI key not configured or request failed).</p>}
          {data.results.length === 0 && <p>No matching records in the database.</p>}
          {data.results.map((r) => (
            <Link key={r.service.slug} href={`/services/${r.service.slug}`} className="block rounded-2xl border border-line bg-card p-4">
              <p className="text-xs text-ink2">
                {r.vendor.businessName} · {r.vendor.city} {r.vendor.verificationStatus === "verified" ? "· Verified" : ""}
              </p>
              <p className="font-semibold">{r.service.name}</p>
              <p className="text-sm text-goldink">Total ₦{(r.quote.customerTotalKobo / 100).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
