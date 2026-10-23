import { describe, expect, it } from "vitest";
import { categoryImage } from "../src/lib/category-images";
import { PHOTOS, publicWellnessPhoto } from "../src/lib/photos";
import { demoHomeRails, demoNearbyVendors } from "../src/lib/demo-catalog";
import {
  DEFAULT_HOME_FEED_CONFIG,
  HOME_FEED_CONFIG_KEYS,
  HOME_FEED_LIMIT_MAX,
  parseHomeFeedConfig,
  homeServicePoolTake
} from "../src/lib/home-types";

describe("home feed item counts", () => {
  it("parses admin SystemConfig keys and clamps so rails cannot empty or explode", () => {
    expect(parseHomeFeedConfig({})).toEqual(DEFAULT_HOME_FEED_CONFIG);
    expect(
      parseHomeFeedConfig({
        [HOME_FEED_CONFIG_KEYS.featured]: "3",
        [HOME_FEED_CONFIG_KEYS.premium]: "12",
        [HOME_FEED_CONFIG_KEYS.promo]: "2",
        [HOME_FEED_CONFIG_KEYS.nearby]: "5"
      })
    ).toEqual({ featured: 3, premium: 12, promo: 2, nearby: 5 });
    expect(
      parseHomeFeedConfig({
        [HOME_FEED_CONFIG_KEYS.featured]: "0",
        [HOME_FEED_CONFIG_KEYS.premium]: "999",
        [HOME_FEED_CONFIG_KEYS.promo]: "not-a-number",
        [HOME_FEED_CONFIG_KEYS.nearby]: "-4"
      })
    ).toEqual({
      featured: 1,
      premium: HOME_FEED_LIMIT_MAX,
      promo: DEFAULT_HOME_FEED_CONFIG.promo,
      nearby: 1
    });
  });

  it("slices demo rails and nearby vendors to the configured limits", () => {
    const rails = demoHomeRails({ featured: 2, premium: 1, promo: 3, nearby: 2 });
    expect(rails.featured).toHaveLength(2);
    expect(rails.premium).toHaveLength(1);
    expect(rails.promo).toHaveLength(3);
    expect(rails.featured.every((c) => c.badge === "Featured")).toBe(true);
    expect(demoNearbyVendors().slice(0, 2)).toHaveLength(2);
    expect(homeServicePoolTake({ featured: 8, premium: 8, promo: 8, nearby: 8 })).toBe(36);
  });
});

describe("public wellness photos", () => {
  it("replaces Unsplash stock URLs with local Nigerian photos", () => {
    expect(publicWellnessPhoto("https://images.unsplash.com/photo-1600334129128-685c5582fd35", PHOTOS.spa)).toBe(
      PHOTOS.spa
    );
    expect(publicWellnessPhoto("/photos/massage.jpg")).toBe("/photos/massage.jpg");
    expect(categoryImage("massage", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874")).toBe(PHOTOS.massage);
  });
});
