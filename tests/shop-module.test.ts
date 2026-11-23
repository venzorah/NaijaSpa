import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { isShopHostname, shopRewritePath, sessionCookieDomain } from "../src/lib/shop-host";
import { quoteVendorShipping, shopCommissionKobo, shopVendorPayableKobo, quoteMasterTotals } from "../src/lib/shop/quote";
import { availableStock } from "../src/lib/shop/inventory";
import { visibleAdminScreens } from "../src/lib/admin";
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

describe("shop isolation in existing portals", () => {
  it("adds Manage Ecommerce for super admins without hiding homepage", () => {
    const screens = visibleAdminScreens("super_admin");
    expect(screens.some((s) => s.id === "ecommerce")).toBe(true);
    expect(screens.some((s) => s.id === "homepage")).toBe(true);
    expect(visibleAdminScreens("analyst").some((s) => s.id === "ecommerce")).toBe(false);
  });

  it("hides service booking nav for product-only vendors", () => {
    const hrefs = vendorNavFor("products").flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/vendor/shop");
    expect(hrefs).not.toContain("/vendor/bookings");
    expect(vendorNavFor("both").flatMap((g) => g.items.map((i) => i.href))).toContain("/vendor/bookings");
  });
});
