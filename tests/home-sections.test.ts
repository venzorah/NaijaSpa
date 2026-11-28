import { describe, expect, it } from "vitest";
import { visibleAdminScreens } from "../src/lib/admin";
import {
  curateCategories,
  DEFAULT_HOME_SECTIONS,
  HOME_SECTION_IDS,
  makeExtraHomeSection,
  parseHomeSections,
  pickManualIds,
  sectionKind,
  collectedManualProductIds
} from "../src/lib/home-sections";

describe("homepage section layout", () => {
  it("fills every homepage section from saved JSON without dropping defaults", () => {
    const layout = parseHomeSections(
      JSON.stringify([
        { id: "featured", title: "Editors’ picks", source: "manual", visible: true, serviceIds: ["s1", "s1", ""], vendorIds: ["v1"] },
        { id: "invented", title: "Ignore" }
      ])
    );
    expect(layout.map((row) => row.id)).toEqual([...HOME_SECTION_IDS]);
    expect(layout.find((row) => row.id === "featured")).toMatchObject({
      title: "Editors’ picks",
      source: "manual",
      serviceIds: ["s1"],
      vendorIds: ["v1"]
    });
    expect(layout.find((row) => row.id === "promo")?.title).toBe(DEFAULT_HOME_SECTIONS.find((row) => row.id === "promo")?.title);
    expect(layout[0]?.sortOrder).toBe(1);
  });

  it("orders rails by admin sort numbers with 1 first", () => {
    const layout = parseHomeSections(
      JSON.stringify(
        DEFAULT_HOME_SECTIONS.map((row) =>
          row.id === "promo" ? { ...row, sortOrder: 1 } : row.id === "featured" ? { ...row, sortOrder: 6 } : row
        )
      )
    );
    expect(layout[0]?.id).toBe("promo");
    expect(layout.find((row) => row.id === "featured")?.sortOrder).toBeGreaterThan(1);
  });

  it("orders featured-collection tiles without touching the main category carousel", () => {
    const categories = [{ slug: "spa" }, { slug: "massage" }, { slug: "nuru" }];
    expect(
      curateCategories(categories, {
        id: "collections",
        title: "Featured collections",
        subtitle: "",
        visible: true,
        source: "manual",
        sortOrder: 4,
        serviceIds: [],
        vendorIds: [],
        categorySlugs: ["nuru", "spa"],
        productIds: []
      }).map((row) => row.slug)
    ).toEqual(["nuru", "spa"]);
    expect(HOME_SECTION_IDS.includes("categories" as (typeof HOME_SECTION_IDS)[number])).toBe(false);
    expect(
      curateCategories(categories, {
        id: "collections",
        title: "Featured collections",
        subtitle: "",
        visible: true,
        source: "manual",
        sortOrder: 4,
        serviceIds: [],
        vendorIds: [],
        categorySlugs: [],
        productIds: []
      })
    ).toEqual([]);
  });

  it("fills a manual rail from services, then providers, then categories", () => {
    const pool = [
      { id: "s-a", vendorId: "v1", category: "spa" },
      { id: "s-b", vendorId: "v1", category: "massage" },
      { id: "s-c", vendorId: "v2", category: "nuru" }
    ];
    const picked = pickManualIds(
      {
        id: "featured",
        title: "Featured",
        subtitle: "",
        visible: true,
        source: "manual",
        sortOrder: 1,
        serviceIds: ["s-c"],
        vendorIds: ["v1"],
        categorySlugs: ["nuru"],
        productIds: []
      },
      8,
      (id) => pool.find((row) => row.id === id),
      (vendorId) => pool.filter((row) => row.vendorId === vendorId),
      (slug) => pool.filter((row) => row.category === slug),
      (row) => row.id
    );
    expect(picked.map((row) => row.id)).toEqual(["s-c", "s-a", "s-b"]);
    expect(
      curateCategories(
        [{ slug: "spa" }, { slug: "massage" }, { slug: "nuru" }, { slug: "body" }, { slug: "beauty" }],
        {
          id: "collections",
          title: "Featured collections",
          subtitle: "",
          visible: true,
          source: "auto",
          sortOrder: 4,
          serviceIds: [],
          vendorIds: [],
          categorySlugs: [],
          productIds: []
        },
        4
      ).map((row) => row.slug)
    ).toEqual(["spa", "massage", "nuru", "body"]);
  });

  it("keeps extra homepage rails the admin added", () => {
    const extra = makeExtraHomeSection("premium", 9);
    const layout = parseHomeSections(
      JSON.stringify([
        ...DEFAULT_HOME_SECTIONS,
        { ...extra, title: "More premium", visible: true }
      ])
    );
    expect(layout).toHaveLength(HOME_SECTION_IDS.length + 1);
    const added = layout.find((row) => row.id === extra.id);
    expect(added).toMatchObject({ title: "More premium", kind: "premium" });
    expect(sectionKind(added!)).toBe("premium");
    expect(parseHomeSections(JSON.stringify([...DEFAULT_HOME_SECTIONS, { id: "invented", kind: "promo" }])).map((row) => row.id)).toEqual([
      ...HOME_SECTION_IDS
    ]);
  });

  it("keeps Shop products off the spa homepage until an admin turns the section on", () => {
    const layout = parseHomeSections(null);
    expect(HOME_SECTION_IDS).toContain("shopProducts");
    expect(layout.find((row) => row.id === "shopProducts")).toMatchObject({
      visible: false,
      source: "auto",
      productIds: []
    });
    expect(layout.find((row) => row.id === "featured")?.visible).toBe(true);
  });

  it("hydrates manual Shop product ids without mixing them into treatment rails", () => {
    const layout = parseHomeSections(
      JSON.stringify([
        { id: "shopProducts", visible: true, source: "manual", productIds: ["p1", "p1", "", "p2"] },
        { id: "featured", source: "manual", visible: true, productIds: ["ignore-me"], serviceIds: ["s1"] }
      ])
    );
    const shop = layout.find((row) => row.id === "shopProducts");
    expect(shop).toMatchObject({ visible: true, source: "manual", productIds: ["p1", "p2"] });
    expect(layout.find((row) => row.id === "featured")?.productIds).toEqual([]);
    expect(collectedManualProductIds(layout)).toEqual(["p1", "p2"]);
  });

  it("exposes the homepage curator to content and marketing staff", () => {
    expect(visibleAdminScreens("super_admin").some((s) => s.id === "homepage")).toBe(true);
    expect(visibleAdminScreens("content_manager").some((s) => s.id === "homepage")).toBe(true);
    expect(visibleAdminScreens("marketing_manager").some((s) => s.id === "homepage")).toBe(true);
    expect(visibleAdminScreens("analyst").some((s) => s.id === "homepage")).toBe(false);
  });
});
