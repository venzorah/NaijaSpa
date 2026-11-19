import { describe, expect, it } from "vitest";
import { canApplyDetectedPlace, livePlaceFromIpFields, placeFromEdgeHeaders } from "../src/lib/geo-ip";
import { hubLabelForPlace } from "../src/lib/hubs";
import { formatPlaceLabel, placeFromNominatim, vendorMatchesPlace } from "../src/lib/nigeria";
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

  it("prefers Vercel ISO region codes and the city name over a mismatched state", () => {
    expect(livePlaceFromIpFields({ countryCode: "NG", region: "FC", city: "Abuja" })).toMatchObject({
      country: "NG",
      state: "FCT",
      city: "Abuja",
      source: "ip"
    });
    expect(livePlaceFromIpFields({ countryCode: "NG", region: "LA", city: "Abuja" })).toMatchObject({
      state: "FCT",
      city: "Abuja"
    });
    expect(livePlaceFromIpFields({ countryCode: "NG", region: "RI", city: "Port Harcourt" })).toMatchObject({
      state: "Rivers",
      city: "Port Harcourt"
    });
  });

  it("reads Vercel edge geo headers instead of looking up the function IP", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "NG",
      "x-vercel-ip-country-region": "FC",
      "x-vercel-ip-city": "Abuja"
    });
    expect(placeFromEdgeHeaders(headers)).toMatchObject({ state: "FCT", city: "Abuja", source: "ip" });
  });

  it("does not remap Rivers to the old Port Harcourt hub label", () => {
    expect(hubLabelForPlace({ state: "Rivers", city: "Obio-Akpor", neighbourhood: "", country: "NG" })).toBe(
      "Obio-Akpor, Nigeria"
    );
  });

  it("lets GPS replace a wrong IP city and keeps a manual pick", () => {
    const lagosIp = { state: "Lagos", city: "Lagos", neighbourhood: "", country: "NG", source: "ip" as const };
    const abujaGps = { state: "FCT", city: "Abuja", neighbourhood: "Maitama", country: "NG", source: "gps" as const };
    expect(canApplyDetectedPlace(lagosIp, abujaGps)).toBe(true);
    expect(canApplyDetectedPlace(abujaGps, lagosIp)).toBe(false);
    expect(canApplyDetectedPlace({ ...lagosIp, source: "manual" }, abujaGps)).toBe(false);
  });

  it("maps Nominatim FCT addresses to Abuja", () => {
    expect(
      placeFromNominatim({
        country_code: "ng",
        state: "Federal Capital Territory",
        city: "Abuja Municipal Area Council",
        suburb: "Maitama",
        "ISO3166-2-lvl4": "NG-FC"
      })
    ).toMatchObject({ country: "NG", state: "FCT", city: "Abuja", neighbourhood: "Maitama", source: "gps" });
  });

  it("builds international hub paths from IP places", () => {
    const london = livePlaceFromIpFields({ countryCode: "GB", region: "England", city: "London" });
    expect(inHref(london)).toBe("/in/gb/england/london");
    expect(parsePlacePath(["gb", "england", "london"])).toMatchObject({ country: "GB", city: "London" });
  });
});
