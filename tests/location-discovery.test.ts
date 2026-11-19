import { describe, expect, it } from "vitest";
import { livePlaceFromIpFields } from "../src/lib/geo-ip";
import { formatPlaceLabel, vendorMatchesPlace } from "../src/lib/nigeria";
import { inHref, parsePlacePath } from "../src/lib/place-urls";
import { demoSearch } from "../src/lib/demo-catalog";

describe("automatic location labels", () => {
  it("formats Lagos, Abuja, London and New York for the nav chip", () => {
    expect(formatPlaceLabel(livePlaceFromIpFields({ countryCode: "NG", region: "Lagos", city: "Ikeja" }))).toBe("Lagos, Nigeria");
    expect(formatPlaceLabel(livePlaceFromIpFields({ countryCode: "NG", region: "FCT", city: "Abuja" }))).toBe("Abuja, Nigeria");
    expect(formatPlaceLabel(livePlaceFromIpFields({ countryCode: "GB", region: "England", city: "London" }))).toBe("London, United Kingdom");
    expect(formatPlaceLabel(livePlaceFromIpFields({ countryCode: "US", region: "New York", city: "New York" }))).toBe("New York, United States");
  });
});

describe("strict vendor discovery", () => {
  it("keeps Lagos separate from Abuja and London separate from Birmingham", () => {
    const lagos = demoSearch({ state: "Lagos", country: "NG" });
    expect(lagos.results.length).toBeGreaterThan(0);
    expect(lagos.results.every((row) => row.vendor.state === "Lagos")).toBe(true);
    const abuja = demoSearch({ state: "FCT", city: "Abuja", country: "NG" });
    expect(abuja.results.every((row) => row.vendor.state === "FCT")).toBe(true);
    expect(demoSearch({ country: "GB", city: "London" }).results).toEqual([]);
  });

  it("shows a Lekki therapist in Ikoyi only when coverage includes Ikoyi", () => {
    const lekki = { state: "Lagos", city: "Lagos", neighbourhood: "Lekki", coverage: ["Ikoyi"] };
    expect(vendorMatchesPlace(lekki, { state: "Lagos", neighbourhood: "Ikoyi" })).toBe(true);
    expect(vendorMatchesPlace({ ...lekki, coverage: [] }, { state: "Lagos", neighbourhood: "Ikoyi" })).toBe(false);
  });

  it("builds international hub paths from IP places", () => {
    const london = livePlaceFromIpFields({ countryCode: "GB", region: "England", city: "London" });
    expect(inHref(london)).toBe("/in/gb/england/london");
    expect(parsePlacePath(["gb", "england", "london"])).toMatchObject({ country: "GB", city: "London" });
  });
});
