import type { LocationType } from "./commercial";
import type { LivePlace, TherapistGender } from "./nigeria";

export type SearchTherapist = {
  id: string;
  name: string;
  gender: string;
};

export type SearchFilters = {
  q?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  gender?: TherapistGender;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  verified?: boolean;
  durationMin?: number;
  locationType?: LocationType;
  publicContact?: boolean;
  sort?: "relevance" | "price" | "rating" | "availability";
  page?: number;
  take?: number;
  /** all = every query token must match; any = show listings that match at least one token. */
  matchMode?: "all" | "any";
  /** Rank closer vendors first without hiding the rest. */
  rankPlace?: LivePlace | null;
};
