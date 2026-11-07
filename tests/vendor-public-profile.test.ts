import { describe, expect, it } from "vitest";
import { vendorPublicProfileState } from "../src/lib/vendor-public-profile";

describe("vendor public profile availability", () => {
  it("offers the public link only for approved public listings", () => {
    expect(vendorPublicProfileState("public", "approved")).toEqual({ available: true, message: "" });
    expect(vendorPublicProfileState("hidden", "approved").available).toBe(false);
  });
  it("explains a suspension even when visibility is public", () => {
    for (const visibility of ["hidden", "public"]) {
      expect(vendorPublicProfileState(visibility, "suspended")).toMatchObject({ available: false, message: expect.stringContaining("suspended") });
    }
  });
  it("keeps draft, pending, rejected and unknown states private", () => {
    for (const status of ["draft", "submitted", "under_review", "rejected", "unknown"]) {
      const state = vendorPublicProfileState("public", status);
      expect(state.available).toBe(false);
      expect(state.message.length).toBeGreaterThan(0);
    }
  });
});
