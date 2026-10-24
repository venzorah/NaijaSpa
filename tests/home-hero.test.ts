import { describe, expect, it } from "vitest";
import {
  DEFAULT_HERO_ADS,
  DEFAULT_HERO_AD_DISPLAY_LIMIT,
  HERO_AD_LIMIT_KEY,
  HERO_AD_LIMIT_MAX,
  demoHomeHero,
  parseHeroAdDisplayLimit,
  visibleHeroAds
} from "../src/lib/home-hero";

describe("homepage hero ads", () => {
  it("parses admin display count and clamps so the carousel cannot empty or explode", () => {
    expect(parseHeroAdDisplayLimit({})).toBe(DEFAULT_HERO_AD_DISPLAY_LIMIT);
    expect(parseHeroAdDisplayLimit({ [HERO_AD_LIMIT_KEY]: "1" })).toBe(1);
    expect(parseHeroAdDisplayLimit({ [HERO_AD_LIMIT_KEY]: "99" })).toBe(HERO_AD_LIMIT_MAX);
    expect(parseHeroAdDisplayLimit({ [HERO_AD_LIMIT_KEY]: "0" })).toBe(1);
    expect(parseHeroAdDisplayLimit({ [HERO_AD_LIMIT_KEY]: "nope" })).toBe(DEFAULT_HERO_AD_DISPLAY_LIMIT);
  });

  it("slices posted ads to the admin display limit", () => {
    const extra = DEFAULT_HERO_ADS.concat(
      DEFAULT_HERO_ADS.map((ad, i) => ({ ...ad, id: `extra-${i}`, sortOrder: 10 + i, active: true }))
    );
    expect(visibleHeroAds(extra, 2)).toHaveLength(2);
    expect(visibleHeroAds(extra, 1)[0].id).toBe(DEFAULT_HERO_ADS[0].id);
    expect(visibleHeroAds(DEFAULT_HERO_ADS.map((ad) => ({ ...ad, active: false })), 2)).toHaveLength(0);
  });

  it("returns demo banner copy when the database is unavailable", () => {
    const demo = demoHomeHero(2);
    expect(demo.banner.title.length).toBeGreaterThan(4);
    expect(demo.ads).toHaveLength(2);
    expect(demo.displayLimit).toBe(2);
  });
});
