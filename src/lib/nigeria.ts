export const NIGERIA_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara"
] as const;

export type TherapistGender = "male" | "female";
export type PlaceSource = "ip" | "gps" | "manual";

export function normalizePlace(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function placesEqual(a?: string | null, b?: string | null) {
  const left = normalizePlace(a);
  const right = normalizePlace(b);
  return Boolean(left && right && left === right);
}

export function prismaEquals(value: string) {
  return { equals: value.trim() };
}

export function placeCountry(place?: { country?: string; state?: string; city?: string } | null) {
  const raw = (place?.country || "").trim().toUpperCase();
  if (raw === "UK") return "GB";
  if (raw) return raw;
  if (mapNigeriaState(place?.state) || mapNigeriaState(place?.city)) return "NG";
  return "";
}

export function countryDisplayName(code?: string | null) {
  const country = placeCountry({ country: code || "" });
  if (!country) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country;
  } catch {
    return country;
  }
}

export function formatPlaceLabel(place?: LivePlace | null) {
  if (!place || (!place.city && !place.state && !place.country)) return "Choose location";
  const country = countryDisplayName(placeCountry(place)) || (placeCountry(place) === "NG" ? "Nigeria" : "");
  const city = place.city?.trim() || (place.state === "FCT" ? "Abuja" : "");
  const region = place.state === "FCT" ? "Abuja" : place.state?.trim();
  const local = city || region;
  if (local && country) return `${local}, ${country}`;
  return local || country || "Choose location";
}

/** Auto home/browse: whole Nigerian state, not a village OSM used as the city. */
export function stateBrowsePlace(place?: LivePlace | null): LivePlace | null {
  if (!place) return null;
  const ng = mapNigeriaState(place.state) || mapNigeriaState(place.city);
  if (!ng) return { ...place, neighbourhood: place.neighbourhood || "" };
  return {
    country: "NG",
    state: ng,
    city: ng === "FCT" ? "Abuja" : ng === "Lagos" ? "Lagos" : "",
    neighbourhood: "",
    source: place.source
  };
}

/** Top bar: Abuja, Nigeria / Lagos, Nigeria from the detected state or city. */
export function navPlaceLabel(place?: LivePlace | null) {
  if (place?.source === "ip") return "Locating…";
  const ng = mapNigeriaState(place?.state) || mapNigeriaState(place?.city);
  if (ng) return `${ng === "FCT" ? "Abuja" : ng}, Nigeria`;
  if (!place?.state && !place?.city) return "Locating…";
  return formatPlaceLabel(place);
}

/** Canonical region for coverage. Nigerian states collapse Abuja → FCT; other countries keep region name. */
export function serviceAreaState(place?: { state?: string; city?: string; neighbourhood?: string } | null) {
  if (!place) return "";
  return mapNigeriaState(place.state) || mapNigeriaState(place.city) || (place.state || "").trim();
}

export function nigeriaStateLabel(state: string) {
  return state === "FCT" ? "Abuja / FCT" : state;
}

export function serviceAreaAliases(state: string) {
  const canonical = mapNigeriaState(state) || state.trim();
  if (!canonical) return [];
  if (canonical === "FCT") return ["FCT", "Abuja", "Federal Capital Territory"];
  return [canonical];
}

export function sameServiceArea(
  vendor: { state?: string; city?: string; neighbourhood?: string },
  place?: { state?: string; city?: string; neighbourhood?: string } | null
) {
  const area = serviceAreaState(place);
  const vendorArea = serviceAreaState(vendor);
  return Boolean(area && vendorArea && area === vendorArea);
}

export function prismaServiceAreaFilter(state: string) {
  const aliases = serviceAreaAliases(state);
  if (!aliases.length) {
    const region = state.trim();
    if (!region) return {};
    return { state: { ...prismaEquals(region), mode: "insensitive" as const } };
  }
  return {
    OR: aliases.map((alias) => ({ state: { ...prismaEquals(alias), mode: "insensitive" as const } }))
  };
}

function prismaContains(value: string) {
  return { contains: value.trim(), mode: "insensitive" as const };
}

/** Database pre-filter: never pull another country/state, still allow coverage JSON hits. */
export function prismaVendorPlaceFilter(place?: Partial<LivePlace> | null) {
  if (!place || (!place.state && !place.city && !place.neighbourhood && !place.country)) return {};
  const ng = mapNigeriaState(place.state) || mapNigeriaState(place.city);
  const area = (place.neighbourhood || "").trim();
  const city = (place.city || "").trim();
  const cityIsState = Boolean(mapNigeriaState(city));
  if (ng && !area && (!city || cityIsState)) {
    const aliases = serviceAreaAliases(ng);
    return {
      OR: [
        ...aliases.map((alias) => ({ state: { ...prismaEquals(alias), mode: "insensitive" as const } })),
        ...aliases.map((alias) => ({ coverageJson: prismaContains(alias) }))
      ]
    };
  }
  const needles = [...new Set([area, !cityIsState ? city : "", !ng ? (place.state || "").trim() : ""].filter(Boolean))];
  if (!needles.length && ng) return prismaServiceAreaFilter(ng);
  return {
    OR: needles.flatMap((needle) => [
      { neighbourhood: { ...prismaEquals(needle), mode: "insensitive" as const } },
      { city: { ...prismaEquals(needle), mode: "insensitive" as const } },
      { coverageJson: prismaContains(needle) }
    ])
  };
}

/** Validate explicit vendor locations before they enter state-wide search. */
export function vendorStateForLocation(state: string, city: string) {
  const canonical = mapNigeriaState(state);
  if (!canonical) throw Object.assign(new Error("Choose a valid Nigerian state."), { status: 400 });
  const cityName = normalizePlace(city);
  const cityState = cityName.includes("abuja") ? "FCT" : NIGERIA_STATES.find(value => normalizePlace(value) === cityName);
  if (cityState && cityState !== canonical) {
    throw Object.assign(new Error("The city does not match the selected state."), { status: 400 });
  }
  return canonical;
}

export function parseVendorCoverage(
  raw?: string | string[] | null,
  fallback?: { country?: string; state?: string; city?: string; neighbourhood?: string }
) {
  const areas: LivePlace[] = [];
  if (!raw) return areas;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  const rows = Array.isArray(parsed) ? parsed : [];
  for (const row of rows) {
    if (typeof row === "string") {
      const text = row.trim();
      if (!text) continue;
      const asState = mapNigeriaState(text);
      areas.push({
        country: fallback?.country || (asState ? "NG" : ""),
        state: asState || fallback?.state || "",
        city: asState ? fallback?.city || "" : text,
        neighbourhood: asState ? "" : text
      });
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    areas.push({
      country: String(rec.country || fallback?.country || ""),
      state: String(rec.state || fallback?.state || ""),
      city: String(rec.city || ""),
      neighbourhood: String(rec.neighbourhood || rec.area || "")
    });
  }
  return areas;
}

export type VendorLocation = {
  country?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  coverageJson?: string | string[] | null;
  coverage?: string | string[] | null;
};

export function vendorServedPlaces(vendor: VendorLocation): LivePlace[] {
  const home: LivePlace = {
    country: placeCountry(vendor),
    state: vendor.state || "",
    city: vendor.city || "",
    neighbourhood: vendor.neighbourhood || ""
  };
  return [home, ...parseVendorCoverage(vendor.coverageJson ?? vendor.coverage, home)];
}

function placeNeedle(filters: Partial<LivePlace>) {
  const neighbourhood = (filters.neighbourhood || "").trim();
  const city = (filters.city || "").trim();
  if (neighbourhood) return neighbourhood;
  if (city && !mapNigeriaState(city)) return city;
  return "";
}

function areaMatchesNeedle(area: LivePlace, needle: string) {
  return placesEqual(area.neighbourhood, needle) || placesEqual(area.city, needle);
}

/** Strict discovery: never auto-expand to another state or country. Coverage beats business address. */
export function vendorMatchesPlace(
  vendor: VendorLocation & { city?: string; neighbourhood?: string },
  filters: Partial<LivePlace> & { city?: string; neighbourhood?: string; state?: string }
) {
  if (!filters.state && !filters.city && !filters.neighbourhood && !filters.country) return true;
  const wantCountry = placeCountry(filters);
  const wantState = mapNigeriaState(filters.state) || mapNigeriaState(filters.city) || (wantCountry === "NG" ? "" : (filters.state || "").trim());
  const needle = placeNeedle(filters);
  const served = vendorServedPlaces(vendor);
  return served.some((area) => {
    const areaCountry = placeCountry(area) || placeCountry(vendor);
    if (wantCountry && areaCountry && wantCountry !== areaCountry) return false;
    if (wantCountry === "NG" || mapNigeriaState(area.state) || mapNigeriaState(area.city)) {
      const areaState = mapNigeriaState(area.state) || mapNigeriaState(area.city) || mapNigeriaState(vendor.state);
      if (wantState && areaState && wantState !== areaState) return false;
      if (!needle) return Boolean(wantState && (areaState === wantState || !areaState));
      return areaMatchesNeedle(area, needle);
    }
    if (needle) return areaMatchesNeedle(area, needle);
    if (wantState) return placesEqual(area.state, wantState) || placesEqual(area.city, wantState);
    if (wantCountry) return !areaCountry || areaCountry === wantCountry;
    return false;
  });
}

export function filterByServiceArea<T>(
  rows: T[],
  place: LivePlace | null | undefined,
  vendorOf: (row: T) => VendorLocation
) {
  if (!place || (!place.state && !place.city && !place.country && !place.neighbourhood)) return rows;
  return rows.filter((row) => vendorMatchesPlace(vendorOf(row), place));
}

export type LivePlace = {
  state: string;
  city: string;
  neighbourhood: string;
  country?: string;
  source?: PlaceSource;
};

/** Used when the visitor has not picked a city and device location is off. */
export const DEFAULT_LIVE_PLACE: LivePlace = { state: "FCT", city: "Abuja", neighbourhood: "", country: "NG" };

export function isDefaultLivePlace(place?: LivePlace | null) {
  if (!place) return true;
  const state = mapNigeriaState(place.state) || mapNigeriaState(place.city);
  const city = normalizePlace(place.city);
  return state === "FCT" && (!city || city === "abuja") && !normalizePlace(place.neighbourhood);
}

export function placeFromCookieOrDefault(raw?: string | null): LivePlace {
  return parsePlaceCookie(raw) ?? DEFAULT_LIVE_PLACE;
}

export const PLACE_COOKIE = "naijaspa_place";

export function parsePlaceCookie(raw?: string | null): LivePlace | null {
  if (!raw) return null;
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    text = raw;
  }
  try {
    const parsed = JSON.parse(text) as Partial<LivePlace>;
    const state = (parsed.state || "").trim();
    const city = (parsed.city || "").trim();
    const neighbourhood = (parsed.neighbourhood || "").trim();
    const country = (parsed.country || "").trim().toUpperCase();
    const source = parsed.source === "ip" || parsed.source === "gps" || parsed.source === "manual" ? parsed.source : undefined;
    if (!state && !city && !neighbourhood && !country) return null;
    return { state, city, neighbourhood, ...(country ? { country } : {}), ...(source ? { source } : {}) };
  } catch {
    return null;
  }
}

const NG_REGION_CODES: Record<string, string> = {
  AB: "Abia",
  AD: "Adamawa",
  AK: "Akwa Ibom",
  AN: "Anambra",
  BA: "Bauchi",
  BY: "Bayelsa",
  BE: "Benue",
  BO: "Borno",
  CR: "Cross River",
  DE: "Delta",
  EB: "Ebonyi",
  ED: "Edo",
  EK: "Ekiti",
  EN: "Enugu",
  FC: "FCT",
  GO: "Gombe",
  IM: "Imo",
  JI: "Jigawa",
  KD: "Kaduna",
  KN: "Kano",
  KT: "Katsina",
  KE: "Kebbi",
  KO: "Kogi",
  KW: "Kwara",
  LA: "Lagos",
  NA: "Nasarawa",
  NI: "Niger",
  OG: "Ogun",
  ON: "Ondo",
  OS: "Osun",
  OY: "Oyo",
  PL: "Plateau",
  RI: "Rivers",
  SO: "Sokoto",
  TA: "Taraba",
  YO: "Yobe",
  ZA: "Zamfara"
};

export function mapNigeriaRegionCode(raw?: string | null) {
  const value = (raw || "").trim().toUpperCase().replace(/^NG-/, "");
  if (!value) return "";
  if (value === "FCT" || value === "ABUJA") return "FCT";
  return NG_REGION_CODES[value] || "";
}

export function mapNigeriaState(raw?: string | null) {
  const n = normalizePlace(raw);
  if (!n) return "";
  if (n.includes("federal capital") || n === "fct" || /(^|\b)abuja(\b|$)/.test(n)) return "FCT";
  const hit = NIGERIA_STATES.find((s) => {
    const name = normalizePlace(s);
    return n === name || n.startsWith(`${name} `) || n.endsWith(` ${name}`) || n.includes(` ${name} `);
  });
  return hit || "";
}

export function placeFromNominatim(address: {
  country?: string;
  country_code?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  quarter?: string;
  "ISO3166-2-lvl4"?: string;
}) {
  const country = (address.country_code || "").trim().toUpperCase();
  const ng =
    mapNigeriaState(address.state || address.county || address.city) || mapNigeriaRegionCode(address["ISO3166-2-lvl4"]);
  let city = (address.city || address.town || address.village || address.municipality || "").trim();
  if (ng === "FCT" && (!city || /municipal|area council|federal capital/i.test(city))) city = "Abuja";
  const neighbourhood = (address.suburb || address.neighbourhood || address.city_district || address.quarter || "").trim();
  return {
    country: country === "UK" ? "GB" : country || (ng ? "NG" : ""),
    state: ng || (address.state || address.county || "").trim(),
    city,
    neighbourhood,
    source: "gps" as const
  } satisfies LivePlace;
}

/** Higher rank = closer. 3 area, 2 city, 1 state, 0 elsewhere. */
export function placeRank(
  vendor: VendorLocation,
  place?: LivePlace | null
) {
  if (!place || (!place.state && !place.city && !place.neighbourhood && !place.country)) return 0;
  if (!vendorMatchesPlace(vendor, place)) {
    if (placeCountry(place) && placeCountry(place) !== "NG") return 0;
    const regionOnly = { country: place.country, state: place.state, city: "", neighbourhood: "" };
    if (!vendorMatchesPlace(vendor, regionOnly)) return 0;
    return 1;
  }
  const home = vendorServedPlaces(vendor)[0];
  if (place.neighbourhood && placesEqual(home?.neighbourhood, place.neighbourhood)) return 3;
  if (place.city && (placesEqual(home?.city, place.city) || placesEqual(home?.neighbourhood, place.city))) return 2;
  if (serviceAreaState(place) && serviceAreaState(home) === serviceAreaState(place)) return 1;
  return 1;
}

export function sortByPlace<T>(rows: T[], place: LivePlace | null | undefined, vendorOf: (row: T) => { state?: string; city?: string; neighbourhood?: string }) {
  if (!place) return rows;
  return [...rows].sort((a, b) => placeRank(vendorOf(b), place) - placeRank(vendorOf(a), place));
}
