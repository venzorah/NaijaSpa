import type { LocationType } from "./commercial";

export type SearchFilters = {
  q?: string;
  city?: string;
  neighbourhood?: string;
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
