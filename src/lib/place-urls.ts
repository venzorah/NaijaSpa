import { mapNigeriaState, NIGERIA_STATES, normalizePlace, type LivePlace } from "./nigeria";

const COUNTRY_SLUG: Record<string, string> = { uk: "GB", gb: "GB", us: "US", ng: "NG", ca: "CA", ie: "IE", za: "ZA", gh: "GH", ke: "KE", ae: "AE" };

export function countryFromSlug(value?: string | null) {
  const slug = slugifyPlace(value);
  if (COUNTRY_SLUG[slug]) return COUNTRY_SLUG[slug];
  if (slug.length === 2 && !mapNigeriaState(slug)) return slug.toUpperCase();
  return "";
}

export const FILTER_QUERY_KEYS = [
  "q",
  "gender",
  "location",
  "category",
  "minPrice",
  "maxPrice",
  "minRating",
  "verified",
  "duration",
  "whatsapp",
  "sort",
  "page"
] as const;

export type FilterQuery = Partial<Record<(typeof FILTER_QUERY_KEYS)[number], string | undefined>>;

export function slugifyPlace(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deslugPlace(slug?: string | null) {
  return (slug ?? "").trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function titlePlace(deslugged: string) {
  const hit = NIGERIA_STATES.find((s) => normalizePlace(s) === deslugged);
  if (hit) return hit;
  return deslugged.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function placePath(place?: Partial<LivePlace> | null) {
  const country = (place?.country || "").trim().toUpperCase();
  const ng = mapNigeriaState(place?.state) || mapNigeriaState(place?.city);
  let state = slugifyPlace(place?.state);
  const city = slugifyPlace(place?.city);
  const area = slugifyPlace(place?.neighbourhood);
  if (!state && city) {
    const inferred = mapNigeriaState(deslugPlace(city));
    if (inferred) state = slugifyPlace(inferred);
  }
  if (country && country !== "NG" && !ng) {
    const parts = [slugifyPlace(country === "GB" ? "gb" : country), state && state !== city ? state : "", city, area].filter(Boolean);
    return parts.length ? `/${parts.join("/")}` : "";
  }
  const parts = [state, city, area].filter(Boolean);
  return parts.length ? `/${parts.join("/")}` : "";
}

export function placeFromPath(segments?: string[] | null): LivePlace | null {
  const parts = (segments ?? []).map(deslugPlace).filter(Boolean).slice(0, 4);
  if (parts.length === 0) return null;
  const country = countryFromSlug(parts[0]);
  if (country && country !== "NG") {
    const rest = parts.slice(1);
    if (rest.length >= 2) {
      return { country, state: titlePlace(rest[0]), city: titlePlace(rest[1]), neighbourhood: rest[2] ? titlePlace(rest[2]) : "" };
    }
    return { country, state: "", city: rest[0] ? titlePlace(rest[0]) : "", neighbourhood: "" };
  }
  if (parts.length === 1) {
    const asState = mapNigeriaState(parts[0]);
    if (asState) return { state: asState, city: "", neighbourhood: "", country: "NG" };
    return { state: "", city: titlePlace(parts[0]), neighbourhood: "" };
  }
  return {
    country: "NG",
    state: mapNigeriaState(parts[0]) || titlePlace(parts[0]),
    city: titlePlace(parts[1]),
    neighbourhood: parts[2] ? titlePlace(parts[2]) : ""
  };
}

export function placeHasLocation(place?: Partial<LivePlace> | null) {
  return Boolean(place?.state || place?.city || place?.neighbourhood || place?.country);
}

function queryString(query?: FilterQuery | Record<string, string | undefined> | null) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const key of FILTER_QUERY_KEYS) {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function exploreHref(place?: Partial<LivePlace> | null, query?: FilterQuery | Record<string, string | undefined> | null) {
  return `/explore${placePath(place)}${queryString(query)}`;
}

export function inHref(place?: Partial<LivePlace> | null) {
  const suffix = placePath(place);
  return suffix ? `/in${suffix}` : "/";
}

/** Home now lives on /in/... so first-visit locate must run on the default hub, not only on /. */
export function needsLocationResolve(path: string) {
  if (path === "/" || path === "/explore" || path.startsWith("/explore/")) return true;
  return path === "/in/fct/abuja" || path === "/in/fct" || path === "/in/abuja";
}

export const inPlaceHref = inHref;

/** Location-home paths require a known Nigerian state as the first segment. */
export function parsePlacePath(segments?: string[] | null): LivePlace | null {
  const parts = (segments ?? []).map(deslugPlace).filter(Boolean).slice(0, 4);
  if (parts.length === 0) return null;
  const country = countryFromSlug(parts[0]);
  if (country && country !== "NG") {
    const rest = parts.slice(1);
    if (!rest.length) return { country, state: "", city: "", neighbourhood: "" };
    if (rest.length === 1) return { country, state: "", city: titlePlace(rest[0]), neighbourhood: "" };
    return { country, state: titlePlace(rest[0]), city: titlePlace(rest[1]), neighbourhood: rest[2] ? titlePlace(rest[2]) : "" };
  }
  const state = mapNigeriaState(parts[0]);
  if (!state) return null;
  return {
    country: "NG",
    state,
    city: parts[1] ? titlePlace(parts[1]) : "",
    neighbourhood: parts[2] ? titlePlace(parts[2]) : ""
  };
}

export function filtersFromSearchParams(sp: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => {
    const raw = sp[key];
    return (Array.isArray(raw) ? raw[0] : raw) || undefined;
  };
  const query: FilterQuery = {};
  for (const key of FILTER_QUERY_KEYS) {
    query[key] = pick(key);
  }
  query.q = query.q?.trim().slice(0, 500) || undefined;
  const choice = (value: string | undefined, options: string[]) => value && options.includes(value) ? value : undefined;
  query.gender = choice(query.gender, ["male", "female"]);
  query.location = choice(query.location, ["spa", "home", "hotel"]);
  query.sort = choice(query.sort, ["relevance", "price", "rating"]);
  query.verified = query.verified === "1" ? "1" : undefined;
  query.whatsapp = query.whatsapp === "1" ? "1" : undefined;
  const numeric = (value: string | undefined, min: number, max: number, integer = false) => {
    if (!value?.trim()) return undefined;
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isInteger(number)) ? String(number) : undefined;
  };
  query.minPrice = numeric(query.minPrice, 0, 21_474_836.47);
  query.maxPrice = numeric(query.maxPrice, 0, 21_474_836.47);
  query.minRating = numeric(query.minRating, 0, 5);
  query.duration = numeric(query.duration, 1, 1440, true);
  query.page = numeric(query.page, 1, 100_000, true);
  return query;
}

export function exploreQueryRedirect(
  sp: Record<string, string | string[] | undefined>
): string | null {
  const pick = (key: string) => {
    const raw = sp[key];
    return (Array.isArray(raw) ? raw[0] : raw) || undefined;
  };
  if (pick("state") === "all") return null;
  const place = {
    country: pick("country"),
    state: pick("state"),
    city: pick("city"),
    neighbourhood: pick("neighbourhood")
  };
  if (!placeHasLocation(place) && !place.country) return null;
  return exploreHref(place, filtersFromSearchParams(sp));
}
