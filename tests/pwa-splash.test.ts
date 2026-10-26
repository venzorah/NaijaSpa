import { describe, expect, it } from "vitest";
import { appleSplashPixelSizes, appleStartupImages, PWA_SPLASH_BG, SPLASH_MAX_MS } from "../src/lib/pwa-splash";

describe("PWA splash", () => {
  it("uses a white splash background", () => {
    expect(PWA_SPLASH_BG).toBe("#ffffff");
  });

  it("hides the in-app splash at 1.5 seconds and never waits longer", () => {
    expect(SPLASH_MAX_MS).toBe(1500);
  });

  it("covers current iPhone and iPad portrait and landscape slots", () => {
    const images = appleStartupImages();
    expect(images.length).toBe(appleSplashPixelSizes().length * 2);
    expect(images.every((i) => i.url.startsWith("/splash/") && i.media.includes("orientation"))).toBe(true);
    expect(images.some((i) => i.url.includes("1179x2556") && i.media.includes("portrait"))).toBe(true);
    expect(images.some((i) => i.url.includes("1320x2868") && i.media.includes("landscape"))).toBe(true);
  });
});
