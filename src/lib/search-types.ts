import type { LocationType } from "./commercial";
import type { TherapistGender } from "./nigeria";

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
};
