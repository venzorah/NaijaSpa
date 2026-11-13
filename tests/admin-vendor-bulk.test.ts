import { describe, expect, it } from "vitest";
import { vendorBulkData, vendorBulkLabel } from "../src/lib/admin-vendor-bulk";
import { formatAdClicks, formatAdminClicks, formatViews } from "../src/lib/listing-views";

describe("admin vendor bulk updates", () => {
  it("approves and publishes a listing", () => {
    expect(vendorBulkData("approve")).toEqual({
      applicationStatus: "approved",
      visibility: "public",
      verificationStatus: "verified"
    });
  });
  it("keeps public contact as a per-vendor flag", () => {
    expect(vendorBulkData("contact_on")).toEqual({ publicContactEnabled: true });
    expect(vendorBulkData("contact_off")).toEqual({ publicContactEnabled: false });
  });
  it("labels the bulk result", () => {
    expect(vendorBulkLabel("hide", 3)).toBe("Hid 3 vendors from Explore.");
    expect(vendorBulkLabel("approve", 1)).toBe("Approved 1 vendor.");
  });
});

describe("listing view labels", () => {
  it("pluralizes public views and admin clicks", () => {
    expect(formatViews(0)).toBe("0 views");
    expect(formatViews(1)).toBe("1 view");
    expect(formatAdminClicks(2)).toBe("2 admin clicks");
    expect(formatAdClicks(3)).toBe("3 ad clicks");
  });
});
