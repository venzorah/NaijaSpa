import { describe, expect, it } from "vitest";
import { adLandingPath, isTrackingBot, listingTrafficFromSearch } from "../src/lib/listing-traffic";
import { formatAdClicks } from "../src/lib/listing-views";

describe("ad landing traffic", () => {
  it("treats UTM tags as paid ads", () => {
    const traffic = listingTrafficFromSearch(new URLSearchParams("utm_source=facebook&utm_medium=paid&utm_campaign=lekki"));
    expect(traffic.channel).toBe("ad");
    expect(traffic.source).toBe("facebook");
    expect(traffic.campaign).toBe("lekki");
  });

  it("treats Facebook click ids as ads", () => {
    expect(listingTrafficFromSearch(new URLSearchParams("fbclid=abc")).channel).toBe("ad");
    expect(listingTrafficFromSearch(new URLSearchParams("gclid=abc")).channel).toBe("ad");
  });

  it("keeps admin clicks separate from ads", () => {
    expect(listingTrafficFromSearch(new URLSearchParams("from=admin&utm_source=facebook")).channel).toBe("admin");
  });

  it("ignores crawlers that prefetch link previews", () => {
    expect(isTrackingBot("facebookexternalhit/1.1")).toBe(true);
    expect(isTrackingBot("Mozilla/5.0 (Linux; Android 14) Facebook")).toBe(false);
  });

  it("builds a tracked go link for ads", () => {
    expect(adLandingPath("vendor", "osun-wellness", { source: "instagram" })).toContain("/go/v/osun-wellness");
    expect(adLandingPath("service", "lekki-swedish-90", { source: "google" })).toContain("/go/s/lekki-swedish-90");
  });

  it("labels ad clicks", () => {
    expect(formatAdClicks(1)).toBe("1 ad click");
    expect(formatAdClicks(4)).toBe("4 ad clicks");
  });
});
