"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { exploreHref, type FilterQuery } from "@/lib/place-urls";
import type { LivePlace } from "@/lib/nigeria";

const recent = ["Deep tissue Lekki", "Couples massage VI", "Facial Ikeja"];
const popular = ["Hot stone massage", "Home massage Lekki", "Half-day spa package", "Black soap body polish"];

export function ExploreSearchBar({
  place,
  values
}: {
  place: Partial<LivePlace> | null;
  values: FilterQuery;
}) {
  const router = useRouter();
  const [q, setQ] = useState(values.q || "");
  const [focused, setFocused] = useState(false);

  function go(query: string) {
    router.push(exploreHref(place, { ...values, q: query || undefined, page: undefined }));
  }

  const suggestions = q ? popular.filter((p) => p.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <div className="relative mt-5">
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
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
                    onMouseDown={() => {
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
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink2">Recent</p>
              {recent.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    setQ(s);
                    go(s);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-ink hover:bg-elev"
                >
                  <Clock className="h-4 w-4 text-ink2" aria-hidden /> {s}
                </button>
              ))}
              <p className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink2">Trending</p>
              {popular.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
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
