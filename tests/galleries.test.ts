import { describe, expect, it } from "vitest";
import { FREE_ENTITLEMENT, entitlementFromPlan } from "../src/lib/commercial";
import { demoVendorBySlug } from "../src/lib/demo-catalog";
import {
  MAX_VENDOR_GALLERIES,
  assertCanAddImage,
  assertCanCreateGallery,
  assertImageUrl,
  assertVideoLinksAllowed,
  assertVideoUrl,
  detectImageMime,
  parseGalleryConfig,
  publicVideoLinks,
  videoLinksAllowed
} from "../src/lib/galleries";

const paid = entitlementFromPlan(
  {
    code: "MONTHLY",
    commissionBps: 0,
    publicDirectContact: true,
    enhancedVisibility: true,
    sponsoredEligible: true,
    unlimitedListings: true
  },
  new Date("2026-06-01"),
  {
    status: "active",
    startsAt: new Date("2026-05-01"),
    endsAt: new Date("2026-07-01"),
    graceUntil: null,
    source: "payment"
  }
);

describe("therapist galleries", () => {
  it("caps vendors at 7 galleries", () => {
    expect(() => assertCanCreateGallery(MAX_VENDOR_GALLERIES)).toThrow(/at most 7/);
    expect(() => assertCanCreateGallery(6)).not.toThrow();
  });

  it("reads admin image limits from SystemConfig-shaped maps", () => {
    const cfg = parseGalleryConfig({ galleryMaxImagesPerGallery: "4", galleryMaxImageBytes: "512000" });
    expect(cfg.maxImagesPerGallery).toBe(4);
    expect(cfg.maxImageBytes).toBe(512000);
    expect(() => assertCanAddImage(4, cfg, 100)).toThrow(/at most 4/);
    expect(() => assertCanAddImage(1, cfg, 600000)).toThrow(/at most 500 KB/);
  });

  it("detects jpeg magic bytes", () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectImageMime(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("accepts https image and video URLs and rejects http", () => {
    expect(assertImageUrl("https://cdn.example.com/therapist.jpg")).toContain("https://");
    expect(assertImageUrl("/photos/massage.jpg")).toBe("/photos/massage.jpg");
    expect(() => assertImageUrl("http://evil.test/x.jpg")).toThrow(/https/);
    expect(assertVideoUrl("https://www.youtube.com/watch?v=abc")).toContain("youtube.com");
    expect(assertVideoUrl("https://vimeo.com/123")).toContain("vimeo.com");
    expect(assertVideoUrl("https://files.example.com/clip.mp4")).toContain(".mp4");
    expect(() => assertVideoUrl("http://youtube.com/watch?v=abc")).toThrow(/https/);
  });

  it("gates video links on active paid plans", () => {
    expect(videoLinksAllowed(FREE_ENTITLEMENT)).toBe(false);
    expect(videoLinksAllowed(paid)).toBe(true);
    expect(() => assertVideoLinksAllowed(FREE_ENTITLEMENT)).toThrow(/paid plans only/);
    expect(publicVideoLinks([{ id: "1" }], FREE_ENTITLEMENT)).toEqual([]);
    expect(publicVideoLinks([{ id: "1" }], paid)).toEqual([{ id: "1" }]);
  });

  it("shows demo galleries and paid-only public video links", () => {
    const paidVendor = demoVendorBySlug("osun-wellness");
    expect(paidVendor?.galleries[0]?.title).toBe("Lekki therapists");
    expect(paidVendor?.videoLinks.length).toBeGreaterThan(0);
    const freeVendor = demoVendorBySlug("calm-house-ikeja");
    expect(freeVendor?.galleries.length).toBeGreaterThan(0);
    expect(freeVendor?.videoLinks).toEqual([]);
  });
});
