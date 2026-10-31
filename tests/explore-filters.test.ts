import { describe, expect, it } from "vitest";
import { filtersFromSearchParams } from "../src/lib/place-urls";

describe("Explore filter query validation", () => {
  it("does not pass prices beyond the database's kobo integer range", () => {
    expect(filtersFromSearchParams({ maxPrice: "100000000" }).maxPrice).toBeUndefined();
    expect(filtersFromSearchParams({ maxPrice: "21474836.47" }).maxPrice).toBe("21474836.47");
  });
  it("keeps valid combinations and zero-price boundaries", () => {
    const result = filtersFromSearchParams({ q: "  massage  ", minPrice: "0", maxPrice: "40000", minRating: "4.5", duration: "60", page: "2", verified: "1", location: "home", gender: "female", sort: "price" });
    expect(result).toMatchObject({ q: "massage", minPrice: "0", maxPrice: "40000", minRating: "4.5", duration: "60", page: "2", verified: "1", location: "home", gender: "female", sort: "price" });
  });
  it.each(["NaN", "Infinity", "invalid", "-1"])("does not forward unsafe numeric query %s into database filters", (value) => {
    const result = filtersFromSearchParams({ minPrice: value, maxPrice: value, minRating: value, duration: value, page: value });
    expect(result.minPrice).toBeUndefined(); expect(result.maxPrice).toBeUndefined(); expect(result.minRating).toBeUndefined(); expect(result.duration).toBeUndefined(); expect(result.page).toBeUndefined();
  });
  it("rejects unsupported options and fractional pages", () => {
    const result = filtersFromSearchParams({ gender: "other", sort: "unknown", location: "unknown", verified: "true", whatsapp: "true", page: "1.5", minRating: "9", duration: "0" });
    for (const key of ["gender", "sort", "location", "verified", "whatsapp", "page", "minRating", "duration"] as const) expect(result[key]).toBeUndefined();
  });
});
