import { describe, expect, it } from "vitest";
import robots from "../src/app/robots";
import { VENDOR_IMAGE_ROBOTS_TAG, vendorListingRobots, withVendorMediaHeaders } from "../src/lib/seo-robots";

describe("vendor image search exclusion", () => {
  it("asks Google not to index listing photos", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/api/media/galleries/"]));
    expect(vendorListingRobots).toMatchObject({ googleBot: { noimageindex: true, "max-image-preview": "none" } });
  });

  it("marks gallery files as noindex for image search", () => {
    const headers = withVendorMediaHeaders({ "Content-Type": "image/jpeg" });
    expect(headers.get("X-Robots-Tag")).toBe(VENDOR_IMAGE_ROBOTS_TAG);
  });
});
