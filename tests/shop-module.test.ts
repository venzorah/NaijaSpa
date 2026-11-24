import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { isShopHostname, shopRewritePath, sessionCookieDomain } from "../src/lib/shop-host";
import { quoteVendorShipping, shopCommissionKobo, shopVendorPayableKobo, quoteMasterTotals } from "../src/lib/shop/quote";
import { availableStock } from "../src/lib/shop/inventory";
import { isEcommerceAdminPath, visibleAdminScreens } from "../src/lib/admin";
import { ecommerceNavActive } from "../src/components/admin/ecommerce-nav";
import { vendorNavFor } from "../src/components/portal-chrome";
import { DEFAULT_SHOP_HERO, parseShopHero, presentShopHero, publicShopCtaHref } from "../src/lib/shop/hero";

const profile = {
  localEnabled: true,
  localFeeKobo: 200000,
  localEtaDays: 2,
  interstateOn: true,
  pickupEnabled: true,
  freeAboveKobo: 2000000,
  zones: [{ state: "Rivers", feeKobo: 350000, etaDays: 5 }]
};

describe("shop host", () => {
  it("treats shop.naijaspa.com as the shop host and rewrites to /shop", () => {
    expect(isShopHostname("shop.naijaspa.com")).toBe(true);
    expect(shopRewritePath("/")).toBe("/shop");
    expect(shopRewritePath("/cart")).toBe("/shop/cart");
    expect(shopRewritePath("/api/shop/cart")).toBe(null);
    expect(shopRewritePath("/login")).toBe("/shop/login");
    expect(shopRewritePath("/login/vendor")).toBe(null);
    expect(shopRewritePath("/forgot")).toBe(null);
    expect(shopRewritePath("/vendor/shop/onboarding")).toBe(null);
    expect(shopRewritePath("/privacy")).toBe(null);
    expect(shopRewritePath("/explore")).toBe(null);
  });

  it("sends spa marketplace URLs on the shop host to naijaspa.com", async () => {
    const req = new NextRequest("https://shop.naijaspa.com/explore", {
      headers: { host: "shop.naijaspa.com", "x-forwarded-host": "shop.naijaspa.com" }
    });
    const res = await middleware(req);
    expect(res.headers.get("location")).toBe("https://naijaspa.com/explore");
  });

  it("does not geo-redirect shop.naijaspa.com", async () => {
    const req = new NextRequest("http://127.0.0.1:3100/", {
      headers: {
        host: "shop.naijaspa.com",
        "x-forwarded-host": "shop.naijaspa.com",
        "x-forwarded-proto": "https"
      }
    });
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("uses a parent cookie domain in production", () => {
    expect(sessionCookieDomain()).toBeUndefined();
  });
});

describe("shop quote", () => {
  it("charges local shipping and excludes shipping from commission", () => {
    const ship = quoteVendorShipping("Lagos", "Lagos", 800000, profile);
    expect(ship.ok).toBe(true);
    if (!ship.ok) return;
    expect(ship.feeKobo).toBe(200000);
    const commission = shopCommissionKobo(800000, 1000);
    expect(commission).toBe(80000);
    expect(shopVendorPayableKobo(800000, commission, ship.feeKobo)).toBe(920000);
  });

  it("blocks destinations the vendor does not serve", () => {
    const ship = quoteVendorShipping("Lagos", "Kano", 500000, profile);
    expect(ship.ok).toBe(false);
  });

  it("sums three vendor shipments in one checkout", () => {
    const totals = quoteMasterTotals([
      { vendorId: "a", productKobo: 800000, shippingKobo: 200000, commissionBps: 1000, commissionKobo: 80000, vendorPayableKobo: 920000, planCode: "SHOP_FREE", shipOk: true },
      { vendorId: "b", productKobo: 1200000, shippingKobo: 300000, commissionBps: 500, commissionKobo: 60000, vendorPayableKobo: 1440000, planCode: "SHOP_MONTHLY", shipOk: true },
      { vendorId: "c", productKobo: 500000, shippingKobo: 250000, commissionBps: 1000, commissionKobo: 50000, vendorPayableKobo: 700000, planCode: "SHOP_FREE", shipOk: true }
    ]);
    expect(totals.productKobo).toBe(2500000);
    expect(totals.shippingKobo).toBe(750000);
    expect(totals.totalKobo).toBe(3250000);
  });

  it("does not oversell when reserved stock consumes availability", () => {
    expect(availableStock(5, 5)).toBe(0);
    expect(availableStock(5, 2)).toBe(3);
  });
});

describe("shop db skip", () => {
  it("treats credential failures as a long skip, not a 30s blip", async () => {
    const { markShopDbUnavailable, shopDbUnavailable } = await import("../src/lib/shop/ensure");
    markShopDbUnavailable(new Error("Authentication failed against database server, the provided database credentials for `naijaspa` are not valid."));
    expect(shopDbUnavailable()).toBe(true);
  });
});

describe("shop hero", () => {
  it("always returns three slides and fills missing copy from defaults", () => {
    const slides = parseShopHero(JSON.stringify([{ title: "Fresh butters for home." }]));
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe("Fresh butters for home.");
    expect(slides[0].id).toBe("products");
    expect(slides[1].kicker).toBe(DEFAULT_SHOP_HERO[1].kicker);
    expect(slides[2].primaryHref).toBe("/sell");
    expect(slides[0].imageUrl).toBe(DEFAULT_SHOP_HERO[0].imageUrl);
  });

  it("replaces leftover spa lifestyle photos with product stills", () => {
    const slides = parseShopHero(
      JSON.stringify([
        { imageUrl: "/photos/band-spa.jpg" },
        { imageUrl: "/photos/beauty.jpg" },
        { imageUrl: "/photos/spa.jpg" }
      ])
    );
    expect(slides.map((s) => s.imageUrl)).toEqual(DEFAULT_SHOP_HERO.map((s) => s.imageUrl));
  });

  it("rewrites shop paths for the shop host and keeps https links external", () => {
    expect(publicShopCtaHref("/search", true)).toBe("/search");
    expect(publicShopCtaHref("/search", false)).toBe("/shop/search");
    const view = presentShopHero(DEFAULT_SHOP_HERO, false);
    expect(view[0].secondary.external).toBe(true);
    expect(view[0].secondary.href).toBe("https://naijaspa.com");
    expect(view[1].primary.href).toBe("/shop/search");
  });
});

describe("shop product listing media and SEO", () => {
  it("keeps only uploaded gallery paths and caps at featured plus two gallery images", async () => {
    const { shopProductImages, shopListingImages } = await import("../src/lib/shop/product-media");
    expect(
      shopProductImages([
        "https://cdn.example/x.jpg",
        "/api/media/galleries/v1/shop-a.jpg",
        "/api/media/galleries/v1/shop-b.png",
        "/api/media/galleries/v1/shop-c.webp",
        "/api/media/galleries/v1/shop-d.gif"
      ])
    ).toEqual([
      "/api/media/galleries/v1/shop-a.jpg",
      "/api/media/galleries/v1/shop-b.png",
      "/api/media/galleries/v1/shop-c.webp"
    ]);
    expect(shopListingImages([{ url: "/api/media/galleries/v1/shop-a.jpg" }, { url: "/api/media/galleries/v1/shop-b.png" }]).gallery).toEqual([
      "/api/media/galleries/v1/shop-b.png"
    ]);
  });

  it("prefers SEO title and meta description over product copy", async () => {
    const { shopProductSeo } = await import("../src/lib/shop/seo");
    expect(
      shopProductSeo({
        name: "Shea butter",
        description: "A long product description that should not win.",
        seoTitle: "Buy shea butter in Abuja",
        metaDescription: "Soft shea from approved sellers."
      })
    ).toEqual({ title: "Buy shea butter in Abuja", description: "Soft shea from approved sellers." });
  });
});

describe("shop catalog filters", () => {
  it("filters by naira price and minimum rating, then sorts", async () => {
    const { applyShopCatalogFilters, parseShopCatalogQuery } = await import("../src/lib/shop/filters");
    const filters = parseShopCatalogQuery({ min: "2000", max: "8000", rating: "4", sort: "price-asc" });
    expect(filters.minNaira).toBe(2000);
    expect(filters.rating).toBe(4);
    const rows = applyShopCatalogFilters(
      [
        { priceKobo: 150000, ratingAvg: 5 },
        { priceKobo: 400000, ratingAvg: 4.2 },
        { priceKobo: 900000, ratingAvg: 5 },
        { priceKobo: 500000, ratingAvg: 2 }
      ],
      filters
    );
    expect(rows.map((r) => r.priceKobo)).toEqual([400000]);
  });
});

describe("admin shop load", () => {
  it("returns the error instead of a silent empty fallback", async () => {
    const { adminShopLoad } = await import("../src/lib/shop/admin-load");
    const failed = await adminShopLoad(async () => {
      throw new Error("relation shopProduct does not exist");
    });
    expect(failed).toEqual({ ok: false, error: "relation shopProduct does not exist" });
    const ok = await adminShopLoad(async () => [{ id: "1" }]);
    expect(ok).toEqual({ ok: true, data: [{ id: "1" }] });
  });
});

describe("shop isolation in existing portals", () => {
  it("adds Manage Ecommerce for super admins without hiding homepage", () => {
    const screens = visibleAdminScreens("super_admin");
    expect(screens.some((s) => s.id === "ecommerce")).toBe(true);
    expect(screens.some((s) => s.id === "homepage")).toBe(true);
    expect(visibleAdminScreens("analyst").some((s) => s.id === "ecommerce")).toBe(false);
  });

  it("keeps Shop admin chrome off Main Admin and Vendors active only on vendor routes", () => {
    expect(isEcommerceAdminPath("/admin/ecommerce")).toBe(true);
    expect(isEcommerceAdminPath("/admin/ecommerce/vendors?q=a")).toBe(true);
    expect(isEcommerceAdminPath("/admin/vendors")).toBe(false);
    expect(ecommerceNavActive("/admin/ecommerce/vendors/abc", "/admin/ecommerce/vendors")).toBe(true);
    expect(ecommerceNavActive("/admin/ecommerce/vendors", "/admin/ecommerce")).toBe(false);
    expect(ecommerceNavActive("/admin/ecommerce", "/admin/ecommerce")).toBe(true);
  });

  it("hides service booking nav for product-only vendors", () => {
    const hrefs = vendorNavFor("products").flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/vendor/shop/products");
    expect(hrefs).toContain("/vendor/shop/plan");
    expect(hrefs).toContain("/vendor/messages");
    expect(hrefs).not.toContain("/vendor/chats");
    expect(hrefs).not.toContain("/vendor/bookings");
    expect(hrefs).not.toContain("/vendor/subscriptions");
    expect(vendorNavFor("both").flatMap((g) => g.items.map((i) => i.href))).toContain("/vendor/bookings");
    expect(vendorNavFor("services").flatMap((g) => g.items.map((i) => i.href))).toContain("/vendor/bookings");
  });

  it("sends product-only vendors away from treatment pages", async () => {
    const { productVendorServicePath, isProductOnlyVendor } = await import("../src/lib/shop/vendor-kind");
    expect(isProductOnlyVendor("products")).toBe(true);
    expect(productVendorServicePath("/vendor/bookings")).toBe(true);
    expect(productVendorServicePath("/vendor/subscriptions")).toBe(true);
    expect(productVendorServicePath("/vendor/chats")).toBe(true);
    expect(productVendorServicePath("/vendor/messages")).toBe(false);
    expect(productVendorServicePath("/vendor/shop/orders")).toBe(false);
    expect(productVendorServicePath("/vendor/dashboard")).toBe(false);
  });
});
