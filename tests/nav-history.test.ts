import { describe, expect, it } from "vitest";
import { bookingResumePath, isAuthNavPath, nextNavStack, popNavStack } from "../src/lib/nav-history";

describe("nav history", () => {
  it("skips auth screens and duplicate hrefs", () => {
    expect(isAuthNavPath("/login/vendor")).toBe(true);
    const stacked = nextNavStack(["/explore"], "/explore");
    expect(stacked).toEqual(["/explore"]);
    expect(nextNavStack(["/explore"], "/login?next=/book/1")).toEqual(["/explore"]);
    expect(nextNavStack(["/explore"], "/services/swedish")).toEqual(["/explore", "/services/swedish"]);
  });

  it("returns the immediate previous page", () => {
    const { previous, stack } = popNavStack(["/explore", "/services/a", "/book/a?continue=pay"], "/book/a?continue=pay");
    expect(previous).toBe("/services/a");
    expect(stack).toEqual(["/explore"]);
  });

  it("builds a booking resume path that continues to payment", () => {
    expect(
      bookingResumePath({ serviceId: "svc1", locationType: "home", startsAt: "2026-11-20T10:00", details: "Ikeja" })
    ).toBe("/book/svc1?location=home&startsAt=2026-11-20T10%3A00&details=Ikeja&continue=pay");
  });
});
