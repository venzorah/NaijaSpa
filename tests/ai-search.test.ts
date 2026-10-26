process.env.USE_DEMO_LISTINGS = "true";

import { describe, expect, it } from "vitest";
import { groundedCatalogSearch, groundedReply, parseQueryLocal, resolveCategorySlug } from "../src/lib/ai-search";
import { demoSearch } from "../src/lib/demo-catalog";

describe("parseQueryLocal", () => {
  it("maps Nuru to the nuru category without requiring the full sentence as q", () => {
    const parsed = parseQueryLocal("Nuru");
    expect(parsed.category).toBe("nuru");
    expect(parsed.q).toBeUndefined();
  });

  it("maps Ikeja to Lagos / Ikeja", () => {
    const parsed = parseQueryLocal("Treatments in Ikeja");
    expect(parsed.state).toBe("Lagos");
    expect(parsed.city).toBe("Lagos");
    expect(parsed.neighbourhood).toBe("Ikeja");
  });

  it("maps couples to the couples category", () => {
    const parsed = parseQueryLocal("Couples treatments");
    expect(parsed.category).toBe("couples");
  });

  it("maps massage onto a live category slug that contains massage", () => {
    const slug = resolveCategorySlug("massage", [{ slug: "body-treatment-massage", name: "Body Treatment" }]);
    expect(slug).toBe("body-treatment-massage");
    const parsed = parseQueryLocal("Massage in Abuja", {}, [{ slug: "body-treatment-massage", name: "Body Treatment" }]);
    expect(parsed.category).toBe("body-treatment-massage");
    expect(parsed.state).toBe("FCT");
  });

  it("does not treat generic spa as a spa-treatment category", () => {
    const parsed = parseQueryLocal("A highly rated spa in Lekki under ₦30,000");
    expect(parsed.category).toBeUndefined();
    expect(parsed.neighbourhood).toBe("Lekki");
    expect(parsed.maxPriceNaira).toBe(30000);
    expect(parsed.minRating).toBe(4.5);
  });

  it("clears a prior neighbourhood when the new query names another city", () => {
    const parsed = parseQueryLocal("Abuja", parseQueryLocal("Ikeja"));
    expect(parsed.city).toBe("Abuja");
    expect(parsed.neighbourhood).toBeUndefined();
  });
});

describe("demo catalog text match", () => {
  it("finds Nuru, Ikeja and couples from listing text", () => {
    expect(demoSearch({ q: "nuru", matchMode: "any" }).results.some((r) => r.service.slug === "nuru-silk-ritual")).toBe(true);
    expect(demoSearch({ q: "ikeja", matchMode: "any" }).results.every((r) => r.vendor.neighbourhood === "Ikeja")).toBe(true);
    expect(demoSearch({ q: "couples", matchMode: "any" }).results.some((r) => r.service.slug === "couples-ritual")).toBe(true);
  });
});

describe("groundedCatalogSearch", () => {
  it("returns the Nuru listing for a Nuru query", async () => {
    const result = await groundedCatalogSearch(parseQueryLocal("Nuru"), "Nuru");
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => r.service.slug === "nuru-silk-ritual")).toBe(true);
    expect(result.results.every((r) => r.vendor.businessName.length > 0)).toBe(true);
  });

  it("returns Ikeja vendors for an Ikeja query", async () => {
    const result = await groundedCatalogSearch(parseQueryLocal("Ikeja"), "Ikeja");
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => r.vendor.businessName === "Calm House Ikeja")).toBe(true);
  });

  it("returns the couples ritual", async () => {
    const result = await groundedCatalogSearch(parseQueryLocal("couples"), "couples");
    expect(result.results.some((r) => r.service.slug === "couples-ritual")).toBe(true);
  });

  it("does not invent a Nuru listing in Ikeja when the catalog only has it in Lekki", async () => {
    const result = await groundedCatalogSearch(parseQueryLocal("Nuru in Ikeja"), "Nuru in Ikeja");
    const nuru = result.results.find((r) => r.service.slug === "nuru-silk-ritual");
    expect(nuru).toBeTruthy();
    expect(nuru?.vendor.neighbourhood).toBe("Lekki");
    expect(groundedReply(result.results, result.scope)).toContain("Lekki");
    expect(groundedReply(result.results, result.scope)).not.toMatch(/Nuru.*Ikeja/i);
  });

  it("is empty only when nothing on the catalog matches", async () => {
    const result = await groundedCatalogSearch(parseQueryLocal("cryotherapy in Kano"), "cryotherapy in Kano");
    expect(result.results).toEqual([]);
  });
});
