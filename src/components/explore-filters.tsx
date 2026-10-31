"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NIGERIA_STATES, nigeriaStateLabel, type LivePlace } from "@/lib/nigeria";
import { exploreHref, type FilterQuery } from "@/lib/place-urls";
import { formatNgn, koboFromNaira } from "@/lib/money";

const RATE_MAX = 80000;
const RATE_MIN = 10000;

const WHERE = [
  { id: "home", label: "Home service" },
  { id: "spa", label: "Studio visit" },
  { id: "hotel", label: "Spa venue" }
] as const;

export function ExploreFilters({
  place,
  values,
  categories
}: {
  place: Partial<LivePlace> | null;
  values: FilterQuery;
  categories: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(values.q || "");
  const maxNaira = values.maxPrice ? Number(values.maxPrice) : RATE_MAX;
  const [rate, setRate] = useState(Number.isFinite(maxNaira) && maxNaira > 0 ? maxNaira : RATE_MAX);
  useEffect(() => setQ(values.q || ""), [values.q]);
  useEffect(() => setRate(Number.isFinite(maxNaira) && maxNaira > 0 ? maxNaira : RATE_MAX), [maxNaira]);

  function go(patch: FilterQuery & { state?: string }) {
    const nextState = patch.state !== undefined ? patch.state : place?.state;
    const stateChanged = patch.state !== undefined && patch.state !== (place?.state || "");
    const { state: _state, ...filterPatch } = patch;
    router.push(
      exploreHref(
        {
          state: nextState,
          city: stateChanged ? "" : place?.city,
          neighbourhood: stateChanged ? "" : place?.neighbourhood
        },
        {
          ...values,
          ...filterPatch,
          page: undefined
        }
      )
    );
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    go({ q: q.trim() || undefined });
  }

  const specialties = categories.slice(0, 8);

  return (
    <aside className="rounded-[1.5rem] border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Filters</p>
        <button type="button" className="text-sm font-semibold text-goldink" onClick={() => router.push(exploreHref(null))}>
          Reset
        </button>
      </div>

      <form onSubmit={onSearch} className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Search</p>
        <input
          aria-label="Treatment or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Treatment or name"
          className="mt-2 min-h-11 w-full rounded-full border border-line bg-bg2 px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-forest"
        />
      </form>

      <label className="mt-6 block">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">State</p>
        <select
          aria-label="State"
          value={place?.state || ""}
          onChange={(e) => go({ state: e.target.value })}
          className="mt-2 min-h-11 w-full rounded-full border border-line bg-bg2 px-4 text-base text-ink outline-none focus:border-forest"
        >
          <option value="">All states</option>
          {NIGERIA_STATES.map((state) => (
            <option key={state} value={state}>
              {nigeriaStateLabel(state)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Specialty</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {specialties.map((c) => {
            const on = values.category === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => go({ category: on ? undefined : c.slug })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  on ? "bg-forest text-white dark:bg-leaf dark:text-forest" : "bg-elev text-ink2"
                }`}
              >
                {c.name.replace(/ treatments?$/i, "")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Where</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WHERE.map((w) => {
            const on = values.location === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => go({ location: on ? undefined : w.id })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  on ? "bg-forest text-white dark:bg-leaf dark:text-forest" : "bg-elev text-ink2"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Max rate</p>
          <p className="text-sm font-bold text-ink">{formatNgn(koboFromNaira(rate))}{rate >= RATE_MAX ? "+" : ""}</p>
        </div>
        <input
          type="range"
          aria-label="Max rate"
          min={RATE_MIN}
          max={RATE_MAX}
          step={5000}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          onPointerUp={(e) => go({ maxPrice: Number(e.currentTarget.value) >= RATE_MAX ? undefined : e.currentTarget.value })}
          onKeyUp={(e) => go({ maxPrice: Number(e.currentTarget.value) >= RATE_MAX ? undefined : e.currentTarget.value })}
          className="mt-3 w-full accent-gold"
        />
      </div>

      <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.verified === "1"}
          onChange={(e) => go({ verified: e.target.checked ? "1" : undefined })}
          className="h-4 w-4 rounded border-line accent-forest"
        />
        Verified providers only
      </label>
    </aside>
  );
}

export function ExploreSort({
  place,
  values
}: {
  place: Partial<LivePlace> | null;
  values: FilterQuery;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-ink2">
      Sort by
      <select
        aria-label="Sort by"
        value={values.sort || "relevance"}
        onChange={(e) =>
          router.push(
            exploreHref(place, {
              ...values,
              sort: e.target.value === "relevance" ? undefined : e.target.value,
              page: undefined
            })
          )
        }
        className="min-h-10 rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink outline-none"
      >
        <option value="relevance">Relevance</option>
        <option value="price">Price</option>
        <option value="rating">Rating</option>
      </select>
    </label>
  );
}
