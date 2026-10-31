"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { exploreHref, type FilterQuery } from "@/lib/place-urls";
import type { LivePlace } from "@/lib/nigeria";

const HISTORY_KEY = "naijaspa-search-history";

export function ExploreSearchBar({
  place,
  values,
  suggestions: popular = []
}: {
  place: Partial<LivePlace> | null;
  values: FilterQuery;
  suggestions?: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(values.q || "");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setQ(values.q || ""), [values.q]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setRecent(saved.filter((value): value is string => typeof value === "string").slice(0, 5));
    } catch { /* Storage can be disabled by the browser. */ }
  }, []);

  function go(query: string) {
    query = query.trim().slice(0, 500);
    setQ(query);
    if (query) {
      const history = [query, ...recent.filter((value) => value !== query)].slice(0, 5);
      setRecent(history);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Optional history. */ }
    }
    setFocused(false);
    input.current?.blur();
    router.push(exploreHref(place, { ...values, q: query || undefined, page: undefined }));
  }

  const suggestions = q ? popular.filter((p) => p.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <div className="relative mt-5" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <label className="flex h-14 flex-1 items-center gap-2 rounded-2xl border border-line bg-card px-4 focus-within:border-leaf">
          <Search className="h-5 w-5 text-leaf" aria-hidden />
          <span className="sr-only">Search</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search treatments, spas or areas"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink2 focus:outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                go("");
              }}
              aria-label="Clear search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink2 hover:bg-elev"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </form>
      {focused ? (
        <div className="absolute inset-x-0 top-[62px] z-30 rounded-2xl border border-line bg-bg2 p-3 shadow-2xl">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setQ(s);
                      go(s);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-ink hover:bg-elev"
                  >
                    <Search className="h-4 w-4 text-ink2" aria-hidden /> {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {recent.length ? <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink2">Recent</p> : null}
              {recent.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQ(s);
                    go(s);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-ink hover:bg-elev"
                >
                  <Clock className="h-4 w-4 text-ink2" aria-hidden /> {s}
                </button>
              ))}
              {popular.length ? <p className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink2">Suggested treatments</p> : null}
              {popular.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQ(s);
                    go(s);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-ink hover:bg-elev"
                >
                  <TrendingUp className="h-4 w-4 text-goldink" aria-hidden /> {s}
                </button>
              ))}
              <a
                href="/ai"
                className="mt-2 flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-gold/10 px-3 text-left text-sm font-semibold text-ink"
              >
                <Sparkles className="h-4 w-4 text-goldink" aria-hidden /> Describe it to NaijaSpa AI instead
              </a>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
