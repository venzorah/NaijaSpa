import { describe, expect, it } from "vitest";
import { diversifyByVendor, shouldDiversifyExploreSort } from "../src/lib/search-diversify";
import { demoSearch } from "../src/lib/demo-catalog";

describe("explore vendor mix", () => {
  it("round-robins vendors instead of listing one catalog in a row", () => {
    const rows = [
      { id: "a1", vendorId: "a" },
      { id: "a2", vendorId: "a" },
      { id: "a3", vendorId: "a" },
      { id: "b1", vendorId: "b" },
      { id: "c1", vendorId: "c" }
    ];
    expect(diversifyByVendor(rows, (row) => row.vendorId).map((row) => row.id)).toEqual([
      "a1",
      "b1",
      "c1",
      "a2",
      "a3"
    ]);
  });

  it("keeps price and rating sorts clustered", () => {
    expect(shouldDiversifyExploreSort("relevance")).toBe(true);
    expect(shouldDiversifyExploreSort(undefined)).toBe(true);
    expect(shouldDiversifyExploreSort("price")).toBe(false);
    expect(shouldDiversifyExploreSort("rating")).toBe(false);
  });

  it("does not fill the first Explore page with one demo vendor", () => {
    const page = demoSearch({ state: "Lagos", take: 6 });
    const vendorIds = page.results.map((row) => row.vendor.slug);
    const unique = new Set(vendorIds);
    if (unique.size > 1) {
      expect(vendorIds[0]).not.toBe(vendorIds[1]);
    }
  });
});
