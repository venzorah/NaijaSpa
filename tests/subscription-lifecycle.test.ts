import { describe, expect, it } from "vitest";
import { calendarDaysUntil, paidUntilMs, renewalNoticeDays, renewalNoticeTitle } from "../src/lib/subscription-renewal";

describe("vendor plan renewal", () => {
  it("sets notice cadence from the package length", () => {
    expect(renewalNoticeDays(7)).toEqual([2, 1, 0]);
    expect(renewalNoticeDays(30)).toEqual([7, 3, 1]);
    expect(renewalNoticeDays(365)).toEqual([30, 14, 7, 1]);
  });

  it("counts whole days until the plan end date", () => {
    const end = new Date("2026-11-10T18:00:00Z");
    expect(calendarDaysUntil(end, new Date("2026-11-08T08:00:00Z"))).toBe(2);
    expect(calendarDaysUntil(end, new Date("2026-11-10T01:00:00Z"))).toBe(0);
    expect(renewalNoticeTitle("sub1", 2)).toBe("Plan renewal · sub1 · 2d");
  });

  it("extends paid coverage by grace days until lapse to Free", () => {
    const ends = new Date("2026-11-10T00:00:00Z");
    expect(paidUntilMs(ends, null, 3)).toBe(ends.getTime() + 3 * 86_400_000);
    expect(paidUntilMs(ends, new Date("2026-11-12T00:00:00Z"), 3)).toBe(new Date("2026-11-12T00:00:00Z").getTime());
  });
});
