import { describe, expect, it } from "vitest";
import {
  bookingResumePath,
  isAuthNavPath,
  nextNavStack,
  popNavStack,
  resumeHrefFromPendingJson,
  sameOriginReferrer
} from "../src/lib/nav-history";

describe("nav history", () => {
  it("records each page including auth screens and drops duplicates", () => {
    expect(isAuthNavPath("/login/vendor")).toBe(true);
    expect(isAuthNavPath("/login/admin")).toBe(true);
    expect(isAuthNavPath("/shop/login")).toBe(true);
    expect(isAuthNavPath("/shop/search")).toBe(false);
    const stacked = nextNavStack(["/explore"], "/explore");
    expect(stacked).toEqual(["/explore"]);
    expect(nextNavStack(["/explore"], "/login?next=/book/1")).toEqual(["/explore", "/login?next=/book/1"]);
    expect(nextNavStack(["/explore"], "/services/swedish")).toEqual(["/explore", "/services/swedish"]);
  });

  it("returns the immediate previous page", () => {
    const { previous, stack } = popNavStack(["/explore", "/services/a", "/book/a?continue=pay"], "/book/a?continue=pay");
    expect(previous).toBe("/services/a");
    expect(stack).toEqual(["/explore"]);
  });

  it("backs from forgot to login, and skips login after a successful booking resume", () => {
    expect(popNavStack(["/explore", "/login/admin", "/forgot?portal=admin"], "/forgot?portal=admin").previous).toBe("/login/admin");
    expect(popNavStack(["/explore", "/login", "/book/a"], "/book/a", { skipAuth: true }).previous).toBe("/explore");
  });

  it("only treats same-origin referrers as in-app history", () => {
    expect(sameOriginReferrer("https://naijaspa.com/login/admin", "https://naijaspa.com")).toBe(true);
    expect(sameOriginReferrer("https://google.com/", "https://naijaspa.com")).toBe(false);
  });

  it("builds a booking resume path that continues to payment", () => {
    expect(
      bookingResumePath({ serviceId: "svc1", locationType: "home", startsAt: "2026-11-20T10:00", details: "Ikeja" })
    ).toBe("/book/svc1?location=home&startsAt=2026-11-20T10%3A00&details=Ikeja&continue=pay");
    expect(
      resumeHrefFromPendingJson(
        JSON.stringify({ serviceId: "svc1", locationType: "spa", startsAt: "2026-11-20T10:00" })
      )
    ).toBe("/book/svc1?location=spa&startsAt=2026-11-20T10%3A00&continue=pay");
    expect(resumeHrefFromPendingJson("{")).toBeNull();
  });
});
