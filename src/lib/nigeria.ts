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

export function vendorMatchesPlace(
  vendor: { state?: string; city: string; neighbourhood: string },
  filters: { state?: string; city?: string; neighbourhood?: string }
) {
  if (filters.state && vendor.state && !placesEqual(vendor.state, filters.state)) return false;
  if (filters.city && filters.neighbourhood) {
    return placesEqual(vendor.city, filters.city) && placesEqual(vendor.neighbourhood, filters.neighbourhood);
  }
  if (filters.city) {
    return placesEqual(vendor.city, filters.city) || placesEqual(vendor.neighbourhood, filters.city);
  }
  if (filters.neighbourhood) return placesEqual(vendor.neighbourhood, filters.neighbourhood);
  return true;
}

export type LivePlace = {
  state: string;
  city: string;
  neighbourhood: string;
};

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
    if (!state && !city && !neighbourhood) return null;
    return { state, city, neighbourhood };
  } catch {
    return null;
  }
}

export function mapNigeriaState(raw?: string | null) {
  const n = normalizePlace(raw);
  if (!n) return "";
  if (n.includes("federal capital") || n === "fct" || n.includes("abuja")) return "FCT";
  const hit = NIGERIA_STATES.find((s) => n === normalizePlace(s) || n.includes(normalizePlace(s)));
  return hit || "";
}

export function placeFromNominatim(address: {
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
}) {
  const state = mapNigeriaState(address.state || address.county);
  const city = (address.city || address.town || address.village || address.municipality || "").trim();
  const neighbourhood = (address.suburb || address.neighbourhood || address.city_district || address.quarter || "").trim();
  return { state, city, neighbourhood } satisfies LivePlace;
}

/** Higher rank = closer. 3 area, 2 city, 1 state, 0 elsewhere. */
export function placeRank(
  vendor: { state?: string; city?: string; neighbourhood?: string },
  place?: LivePlace | null
) {
  if (!place || (!place.state && !place.city && !place.neighbourhood)) return 0;
  const sameState = !place.state || !vendor.state || placesEqual(vendor.state, place.state);
  if (!sameState) return 0;
  if (place.neighbourhood && placesEqual(vendor.neighbourhood, place.neighbourhood) && (!place.city || placesEqual(vendor.city, place.city))) {
    return 3;
  }
  if (place.city && (placesEqual(vendor.city, place.city) || placesEqual(vendor.neighbourhood, place.city))) return 2;
  if (place.state && sameState) return 1;
  return 0;
}

export function sortByPlace<T>(rows: T[], place: LivePlace | null | undefined, vendorOf: (row: T) => { state?: string; city?: string; neighbourhood?: string }) {
  if (!place) return rows;
  return [...rows].sort((a, b) => placeRank(vendorOf(b), place) - placeRank(vendorOf(a), place));
}
