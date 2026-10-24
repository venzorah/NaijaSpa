import { firstWellnessPhoto, PHOTOS } from "./photos";
import { exploreHref } from "./place-urls";
import { normalizePlace, placesEqual } from "./nigeria";

export type ExploreCityCard = {
  state: string;
  city: string;
  listingCount: number;
  coverUrl: string;
  href: string;
};

export type ExploreCityFilters = {
  state?: string;
  excludeCity?: string;
  limit?: number;
};

type PlaceRow = {
  state?: string;
  city: string;
  neighbourhood: string;
  coverUrl?: string | null;
};

function destinationKey(state: string, city: string) {
  return `${normalizePlace(state)}|${normalizePlace(city)}`;
}

/** Unique cities (and named neighbourhoods) that have listings, for explore carousels. */
export function collectExploreCities(rows: PlaceRow[], opts: ExploreCityFilters = {}): ExploreCityCard[] {
  const limit = opts.limit ?? 12;
  const buckets = new Map<string, ExploreCityCard>();

  const bump = (state: string, city: string, cover?: string | null) => {
    const label = city.trim();
    if (!label) return;
    if (opts.excludeCity && placesEqual(label, opts.excludeCity)) return;
    const key = destinationKey(state, label);
    const existing = buckets.get(key);
    if (existing) {
      existing.listingCount += 1;
      if (!existing.coverUrl) existing.coverUrl = firstWellnessPhoto(cover, PHOTOS.bandSpa);
      return;
    }
    buckets.set(key, {
      state,
      city: label,
      listingCount: 1,
      coverUrl: firstWellnessPhoto(cover, PHOTOS.bandSpa),
      href: exploreHref({ state, city: label })
    });
  };

  for (const row of rows) {
    const state = (row.state || "").trim();
    if (opts.state && state && !placesEqual(state, opts.state)) continue;
    bump(state, row.city, row.coverUrl);
    if (row.neighbourhood && !placesEqual(row.neighbourhood, row.city)) {
      bump(state, row.neighbourhood, row.coverUrl);
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.listingCount - a.listingCount || a.city.localeCompare(b.city))
    .slice(0, limit);
}
