import type { LocationType } from "./commercial";

export const BOOKING_STEPS = [
  { n: 1, label: "Location" },
  { n: 2, label: "Time" },
  { n: 3, label: "Review" },
  { n: 4, label: "Pay" }
] as const;

export function locationLabel(location: LocationType | string) {
  if (location === "spa") return "Spa/Office";
  if (location === "hotel") return "Hotel service";
  if (location === "home") return "Home service";
  return location;
}

export function locationAddonLabel(location: LocationType | string) {
  if (location === "spa") return "Spa/Office extra";
  if (location === "hotel") return "Hotel service";
  if (location === "home") return "Home service";
  return "Add-on";
}

export function formatNairaPlain(kobo: number) {
  const n = Math.round(kobo / 100).toString();
  return `₦${n.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatReviewDate(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function numericRating(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value != null && typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatRating(value: unknown, digits = 1) {
  const n = numericRating(value);
  if (n <= 0) return "";
  return n.toFixed(digits);
}
