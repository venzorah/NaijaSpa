import type { LocationType } from "./commercial";

export const BOOKING_STEPS = [
  { n: 1, label: "Location" },
  { n: 2, label: "Time" },
  { n: 3, label: "Review" },
  { n: 4, label: "Pay" }
] as const;

export function locationLabel(location: LocationType | string) {
  if (location === "spa") return "Spa/Office";
  if (location === "hotel") return "Hotel";
  if (location === "home") return "Home";
  return location;
}

export function formatNairaPlain(kobo: number) {
  const n = Math.round(kobo / 100).toString();
  return `₦${n.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatReviewDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
