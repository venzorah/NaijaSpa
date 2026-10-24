"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Info, Search, Sparkles } from "lucide-react";
import { ExploreResultCard, type ExploreResult } from "@/components/explore-result-card";
import { PageHeader } from "@/components/page-header";

type Message = {
  id: number;
  role: "user" | "ai";
  text: string;
  results?: ExploreResult[];
  usedFallback?: boolean;
};

const examples = [
  "Find a highly rated spa in Lekki under ₦30,000",
  "Relaxing massage near me this Saturday",
  "Couples treatments in Abuja",
  "Home service in Lagos",
  "Facial about one hour"
];

export default function AskAiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [prior, setPrior] = useState<Record<string, unknown>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: clean }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, prior })
      });
      const json = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: Date.now() + 1,
            role: "ai",
            text: json.error || "Search failed. Traditional search is still available.",
            results: []
          }
        ]);
        return;
      }
      setPrior(json.filters || {});
      const count = (json.results as ExploreResult[] | undefined)?.length ?? 0;
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "ai",
          text:
            count === 0
              ? "Nothing on NaijaSpa matched that request. Try traditional search or refine the budget, area or treatment."
              : `I found ${count} matching treatment${count === 1 ? "" : "s"} on NaijaSpa.`,
          results: json.results,
          usedFallback: json.usedFallback
        }
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col px-4 pt-6 lg:px-8">
      <PageHeader title="Ask NaijaSpa AI" subtitle="Describe what you need — we’ll find the right treatment." />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-bg2 px-4 py-3 text-sm text-ink2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
        <p className="flex-1">
          AI suggestions can miss things. Prefer to filter yourself?{" "}
          <Link href="/explore" className="font-semibold text-leaf underline underline-offset-2">
            Use traditional search
          </Link>
        </p>
      </div>

      <div className="flex-1 space-y-5 pb-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-goldink">
              <Sparkles className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold text-ink">How would you like to unwind?</h2>
            <p className="mt-1 max-w-sm text-sm text-ink2">Mention a budget, area, day or type of treatment. Try one of these:</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {examples.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => send(e)}
                    className="min-h-[44px] rounded-full border border-line bg-card px-4 py-2 text-left text-sm font-medium text-ink hover:border-gold/50"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-3xl rounded-br-md bg-gold px-4 py-3 text-[15px] font-medium text-ongold">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-goldink">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="rounded-3xl rounded-tl-md bg-card px-4 py-3 text-[15px] leading-relaxed text-ink">{m.text}</p>
                {m.usedFallback ? <p className="text-xs text-ink2">Local parser · OpenAI not configured</p> : null}
                {m.results?.length ? (
                  <ul className="grid gap-3">
                    {m.results.map((r) => (
                      <li key={r.service.slug}>
                        <ExploreResultCard result={r} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {m.results && m.results.length === 0 ? (
                  <Link
                    href="/explore"
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card text-sm font-semibold text-ink"
                  >
                    <Search className="h-4 w-4" aria-hidden /> Open traditional search
                  </Link>
                ) : null}
              </div>
            </div>
          )
        )}

        {thinking ? (
          <div className="flex items-center gap-3" role="status">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-goldink">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex gap-1 rounded-3xl bg-card px-4 py-3.5" aria-label="NaijaSpa AI is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-goldink" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-[64px] -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:bottom-0"
      >
        <label className="flex items-center gap-2 rounded-full border border-line bg-card py-1.5 pl-4 pr-1.5 focus-within:border-leaf">
          <Sparkles className="h-5 w-5 shrink-0 text-goldink" aria-hidden />
          <span className="sr-only">Message NaijaSpa AI</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length ? "Refine: cheaper, evening, home visit…" : "e.g. Deep tissue in VI on Friday"}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink2 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-ongold disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </label>
      </form>
    </div>
  );
}
