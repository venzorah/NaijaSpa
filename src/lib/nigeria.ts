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
