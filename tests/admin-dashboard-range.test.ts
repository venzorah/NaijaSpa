import { describe, expect, it } from "vitest";
import {
  adminDashboardHref,
  adminDashboardSince,
  parseAdminDashboardRange
} from "../src/lib/admin-dashboard";

describe("admin dashboard range", () => {
  it("defaults unknown values to 30 days and keeps 7d/90d", () => {
    expect(parseAdminDashboardRange(undefined)).toBe("30d");
    expect(parseAdminDashboardRange("7d")).toBe("7d");
    expect(parseAdminDashboardRange("90d")).toBe("90d");
    expect(adminDashboardHref("7d")).toBe("/admin/dashboard?range=7d");
    expect(adminDashboardHref("30d")).toBe("/admin/dashboard");
  });

  it("computes the lookback window from the selected range", () => {
    const now = Date.parse("2026-11-13T12:00:00.000Z");
    expect(adminDashboardSince("7d", now).getTime()).toBe(now - 7 * 864e5);
    expect(adminDashboardSince("90d", now).getTime()).toBe(now - 90 * 864e5);
  });
});
