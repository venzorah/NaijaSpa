import { describe, expect, it } from "vitest";
import { demoSearch } from "../src/lib/demo-catalog";
import { vendorMatchesPlace } from "../src/lib/nigeria";

describe("exact place matching", () => {
  it("matches city or area exactly, not as a substring", () => {
    const lekki = { state: "Lagos", city: "Lagos", neighbourhood: "Lekki" };
    expect(vendorMatchesPlace(lekki, { city: "Lagos" })).toBe(true);
    expect(vendorMatchesPlace(lekki, { neighbourhood: "Lekki" })).toBe(true);
    expect(vendorMatchesPlace(lekki, { neighbourhood: "Lekki Phase 1" })).toBe(false);
    expect(vendorMatchesPlace(lekki, { city: "Abuja" })).toBe(false);
    expect(vendorMatchesPlace(lekki, { state: "FCT", city: "Lagos" })).toBe(false);
  });
});

describe("demo therapist search", () => {
  it("returns only therapists in the exact city", () => {
    const lagos = demoSearch({ city: "Lagos" });
    expect(lagos.results.length).toBeGreaterThan(0);
    expect(lagos.results.every((r) => r.vendor.city === "Lagos")).toBe(true);
    const abuja = demoSearch({ city: "Abuja", state: "FCT" });
    expect(abuja.results.length).toBeGreaterThan(0);
    expect(abuja.results.every((r) => r.vendor.city === "Abuja")).toBe(true);
    expect(abuja.results.some((r) => r.vendor.city === "Lagos")).toBe(false);
  });

  it("keeps Lekki distinct from Lekki Phase 1", () => {
    const lekki = demoSearch({ neighbourhood: "Lekki" });
    expect(lekki.results.every((r) => r.vendor.neighbourhood === "Lekki")).toBe(true);
    expect(lekki.results.some((r) => r.vendor.neighbourhood === "Lekki Phase 1")).toBe(false);
  });

  it("filters by preferred gender", () => {
    const women = demoSearch({ city: "Lagos", gender: "female" });
    expect(women.results.length).toBeGreaterThan(0);
    expect(women.results.every((r) => r.therapists.every((t) => t.gender === "female"))).toBe(true);
    const menAbuja = demoSearch({ city: "Abuja", gender: "male" });
    expect(menAbuja.results.every((r) => r.therapists.every((t) => t.gender === "male"))).toBe(true);
    const womenAbuja = demoSearch({ city: "Abuja", gender: "female" });
    expect(womenAbuja.results).toEqual([]);
  });
});
