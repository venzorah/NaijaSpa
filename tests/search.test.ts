import { describe, expect, it } from "vitest";
import { categoryImage } from "../src/lib/category-images";
import { listingPhotos, publicWellnessPhoto } from "../src/lib/photos";
import { demoExploreCities, demoHomeRails, demoNearbyVendors, demoSearch } from "../src/lib/demo-catalog";
import {
  DEFAULT_LIVE_PLACE,
  isDefaultLivePlace,
  placeFromCookieOrDefault,
  placeFromNominatim,
  placeRank,
  vendorMatchesPlace
} from "../src/lib/nigeria";
import { hubLabelForPlace } from "../src/lib/hubs";
import { exploreHref, exploreQueryRedirect, inPlaceHref, needsLocationResolve, parsePlacePath } from "../src/lib/place-urls";

describe("exact place matching", () => {
  it("matches the whole state, treating Abuja and FCT as one area", () => {
    const lekki = { state: "Lagos", city: "Lagos", neighbourhood: "Lekki" };
    const ikeja = { state: "Lagos", city: "Lagos", neighbourhood: "Ikeja" };
    const maitama = { state: "FCT", city: "Abuja", neighbourhood: "Maitama" };
    expect(vendorMatchesPlace(lekki, { city: "Lagos" })).toBe(true);
    expect(vendorMatchesPlace(ikeja, { state: "Lagos", neighbourhood: "Lekki" })).toBe(false);
    expect(vendorMatchesPlace(lekki, { city: "Abuja" })).toBe(false);
    expect(vendorMatchesPlace(lekki, { state: "FCT", city: "Lagos" })).toBe(false);
    expect(vendorMatchesPlace(maitama, { state: "FCT" })).toBe(true);
    expect(vendorMatchesPlace(maitama, { city: "Abuja" })).toBe(true);
    expect(vendorMatchesPlace(maitama, { neighbourhood: "Wuse" })).toBe(false);
    expect(vendorMatchesPlace({ ...lekki, coverage: ["Ikoyi"] }, { state: "Lagos", neighbourhood: "Ikoyi" })).toBe(true);
    expect(vendorMatchesPlace(lekki, { state: "Lagos", neighbourhood: "Ikoyi" })).toBe(false);
    expect(vendorMatchesPlace({ state: "England", city: "London", neighbourhood: "" }, { country: "GB", city: "London" })).toBe(true);
    expect(vendorMatchesPlace({ state: "England", city: "Birmingham", neighbourhood: "" }, { country: "GB", city: "London" })).toBe(false);
  });
});

describe("demo therapist search", () => {
  it("returns every therapist in the state, not only the live area", () => {
    const lagos = demoSearch({ state: "Lagos", city: "Lagos", rankPlace: { state: "Lagos", city: "Lagos", neighbourhood: "Lekki" } });
    expect(lagos.results.length).toBeGreaterThan(0);
    expect(lagos.results.every((r) => r.vendor.state === "Lagos")).toBe(true);
    expect(lagos.results.some((r) => r.vendor.neighbourhood === "Ikeja")).toBe(true);
    expect(lagos.results[0]?.vendor.neighbourhood).toBe("Lekki");
    const abuja = demoSearch({ city: "Abuja", state: "FCT" });
    expect(abuja.results.length).toBeGreaterThan(0);
    expect(abuja.results.every((r) => r.vendor.state === "FCT")).toBe(true);
    expect(abuja.results.some((r) => r.vendor.city === "Lagos")).toBe(false);
  });

  it("ranks Lekki above Lekki Phase 1 without hiding either", () => {
    const place = { state: "Lagos", city: "Lagos", neighbourhood: "Lekki" };
    const lekki = demoSearch({ state: "Lagos", rankPlace: place });
    expect(lekki.results.some((r) => r.vendor.neighbourhood === "Lekki")).toBe(true);
    expect(lekki.results.some((r) => r.vendor.neighbourhood === "Lekki Phase 1")).toBe(true);
    expect(lekki.results[0]?.vendor.neighbourhood).toBe("Lekki");
  });

  it("exposes local listing photos instead of stock CDNs", () => {
    const unsplash = "https://images.unsplash.com/photo-1600334129128-685c5582fd35";
    expect(publicWellnessPhoto(unsplash)).toMatch(/^\/photos\//);
    const listed = demoSearch({ city: "Lagos" });
    expect(listed.results.length).toBeGreaterThan(0);
    for (const row of listed.results) {
      expect(row.service.imageUrl).toMatch(/^\/photos\//);
      expect(row.vendor.coverUrl).toMatch(/^\/photos\//);
      const photos = listingPhotos({
        imageUrl: row.service.imageUrl,
        coverUrl: row.vendor.coverUrl,
        logoUrl: row.vendor.logoUrl
      });
      expect(photos.cover).toMatch(/^\/photos\//);
      expect(photos.avatar).toMatch(/^\/photos\//);
      expect(photos.cover).not.toMatch(/unsplash|pexels|picsum/i);
    }
    expect(categoryImage("massage", "/api/media/categories/abc.jpg")).toBe("/api/media/categories/abc.jpg");
  });

  it("shows sibling cities in the same state when a city has no therapists", () => {
    const statewide = demoSearch({ state: "Lagos", city: "Lagos" });
    expect(statewide.results.length).toBeGreaterThan(0);
    expect(statewide.results.every((r) => r.vendor.state === "Lagos")).toBe(true);
    expect(demoSearch({ state: "Lagos", city: "Yaba" }).results).toEqual([]);
    const siblings = demoExploreCities({ state: "Lagos", excludeCity: "Yaba" });
    expect(siblings.length).toBeGreaterThan(0);
    expect(siblings.every((c) => c.state === "Lagos")).toBe(true);
    expect(siblings.every((c) => c.city.toLowerCase() !== "yaba")).toBe(true);
    expect(siblings.some((c) => c.city === "Ikeja")).toBe(true);
    expect(siblings.some((c) => c.city === "Lekki")).toBe(true);
    expect(siblings.every((c) => c.href.startsWith("/explore/lagos/"))).toBe(true);

    const fromLagosCity = demoExploreCities({ state: "Lagos", excludeCity: "Lagos" });
    expect(fromLagosCity.every((c) => c.city !== "Lagos")).toBe(true);
    expect(fromLagosCity.some((c) => c.city === "Lekki Phase 1")).toBe(true);
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

describe("default marketplace place", () => {
  it("does not invent a city when nothing is stored", () => {
    expect(placeFromCookieOrDefault(null)).toEqual(DEFAULT_LIVE_PLACE);
    expect(isDefaultLivePlace(null)).toBe(true);
    expect(hubLabelForPlace(null)).toBe("Choose location");
    expect(inPlaceHref(DEFAULT_LIVE_PLACE)).toBe("/in/fct/abuja");
  });
});

describe("place URLs", () => {
  it("still resolves device location after home is redirected to /in/...", () => {
    expect(needsLocationResolve("/")).toBe(true);
    expect(needsLocationResolve("/in/fct/abuja")).toBe(true);
    expect(needsLocationResolve("/explore/lagos")).toBe(true);
    expect(needsLocationResolve("/in/lagos/lagos")).toBe(true);
    expect(needsLocationResolve("/account")).toBe(false);
    expect(needsLocationResolve("/login")).toBe(false);
  });

  it("builds distinct shareable paths for Lagos vs Abuja", () => {
    expect(inPlaceHref({ state: "Lagos", city: "Lagos", neighbourhood: "Lekki" })).toBe("/in/lagos/lagos/lekki");
    expect(inPlaceHref({ state: "FCT", city: "Abuja", neighbourhood: "Maitama" })).toBe("/in/fct/abuja/maitama");
    expect(exploreHref({ state: "Lagos", city: "Lagos" }, { gender: "female" })).toBe(
      "/explore/lagos/lagos?gender=female"
    );
    expect(exploreHref({ city: "Abuja" }, { q: "nuru" })).toBe("/explore/fct/abuja?q=nuru");
  });

  it("parses state, city and area slugs back to place fields", () => {
    expect(parsePlacePath(["akwa-ibom"])).toEqual({ country: "NG", state: "Akwa Ibom", city: "", neighbourhood: "" });
    expect(parsePlacePath(["lagos", "lagos", "lekki-phase-1"])).toEqual({
      country: "NG",
      state: "Lagos",
      city: "Lagos",
      neighbourhood: "Lekki Phase 1"
    });
    expect(parsePlacePath(["not-a-state"])).toBeNull();
    expect(parsePlacePath(["fct", "abuja"])).toEqual({ country: "NG", state: "FCT", city: "Abuja", neighbourhood: "" });
    expect(parsePlacePath(["gb", "london"])).toEqual({ country: "GB", state: "", city: "London", neighbourhood: "" });
  });

  it("redirects query-string explore places onto path URLs", () => {
    expect(
      exploreQueryRedirect({
        state: "Lagos",
        city: "Lagos",
        neighbourhood: "Lekki",
        gender: "female",
        q: "nuru"
      })
    ).toBe("/explore/lagos/lagos/lekki?q=nuru&gender=female");
    expect(exploreQueryRedirect({ category: "spa" })).toBeNull();
  });
});

describe("live place ranking", () => {
  it("maps Nominatim Nigeria addresses", () => {
    expect(
      placeFromNominatim({
        state: "Lagos",
        city: "Lagos",
        suburb: "Lekki"
      })
    ).toMatchObject({ state: "Lagos", city: "Lagos", neighbourhood: "Lekki", country: "NG" });
    expect(placeFromNominatim({ state: "Federal Capital Territory", city: "Abuja", suburb: "Maitama" }).state).toBe("FCT");
  });

  it("ranks area above city above state", () => {
    const place = { state: "Lagos", city: "Lagos", neighbourhood: "Lekki" };
    expect(placeRank({ state: "Lagos", city: "Lagos", neighbourhood: "Lekki" }, place)).toBe(3);
    expect(placeRank({ state: "Lagos", city: "Lagos", neighbourhood: "Ikeja" }, place)).toBe(1);
    expect(placeRank({ state: "FCT", city: "Abuja", neighbourhood: "Maitama" }, place)).toBe(0);
  });

  it("puts local therapists first then others in the same state", () => {
    const ranked = demoSearch({
      state: "FCT",
      rankPlace: { state: "FCT", city: "Abuja", neighbourhood: "Maitama" }
    });
    expect(ranked.results[0]?.vendor.city).toBe("Abuja");
    expect(ranked.results.every((r) => r.vendor.state === "FCT")).toBe(true);
    const nationwide = demoSearch({ rankPlace: { state: "FCT", city: "Abuja", neighbourhood: "Maitama" } });
    expect(nationwide.results.some((r) => r.vendor.city === "Lagos")).toBe(true);
    const nearby = demoNearbyVendors();
    expect(nearby.some((v) => v.city === "Abuja")).toBe(true);
    expect(demoHomeRails({ featured: 8, premium: 8, promo: 8, nearby: 8 }).featured.length).toBeGreaterThan(0);
  });
});
