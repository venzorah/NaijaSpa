"use client";

import { useState } from "react";
import { SearchFiltersForm } from "@/components/search-filters-form";

export function ExploreSearch({
  values,
  collapsed
}: {
  values: {
    q?: string;
    state?: string;
    city?: string;
    neighbourhood?: string;
    gender?: string;
    location?: string;
  };
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);

  if (!open) {
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold px-6 text-base font-bold text-ongold sm:w-auto"
        >
          Search Other Cities
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {collapsed ? (
        <button type="button" onClick={() => setOpen(false)} className="mb-2 text-sm font-semibold text-goldink">
          Hide search
        </button>
      ) : null}
      <SearchFiltersForm locateTo="explore" values={values} />
    </div>
  );
}
