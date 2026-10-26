import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMMERCIAL,
  FREE_ENTITLEMENT,
  entitlementFromPlan,
  locationAddonKobo,
  bookingUnlocksVendorContact,
  publicContactAllowed,
  quoteBooking,
  sanitizePublicVendor,
  toInstagramLink,
  toWhatsAppLink
} from "../src/lib/commercial";
import { SUPPORT_WHATSAPP, supportWhatsAppHref } from "../src/lib/support";

const paidPlan = {
  code: "MONTHLY",
  commissionBps: 0,
  publicDirectContact: true,
  enhancedVisibility: true,
  sponsoredEligible: true,
  unlimitedListings: true
};

describe("commission and surcharges", () => {
  it("charges 10% of base on free plan and excludes location add-on from commission", () => {
    const q = quoteBooking({
      basePriceKobo: 20_000_00,
      location: "home",
      locationAddonKobo: 1_000_000,
      entitlement: FREE_ENTITLEMENT,
      config: DEFAULT_COMMERCIAL
    });
    expect(q.surchargeKobo).toBe(1_000_000);
    expect(q.commissionBps).toBe(1000);
    expect(q.commissionKobo).toBe(200_000);
    expect(q.customerTotalKobo).toBe(3_000_000);
    expect(q.vendorPayableKobo).toBe(2_800_000);
  });

  it("never charges a spa extra even when hotel/home add-ons are set", () => {
    const service = { hotelAddonKobo: 1_500_000, homeAddonKobo: 1_000_000 };
    expect(locationAddonKobo("spa", service)).toBe(0);
    expect(locationAddonKobo("hotel", service)).toBe(1_500_000);
    expect(locationAddonKobo("home", service)).toBe(1_000_000);
  });

  it("adds vendor hotel/home add-ons to the total and keeps spa extra at ₦0", () => {
    const spa = quoteBooking({
      basePriceKobo: 20_000_00,
      location: "spa",
      locationAddonKobo: 0,
      entitlement: FREE_ENTITLEMENT,
      config: DEFAULT_COMMERCIAL
    });
    const hotel = quoteBooking({
      basePriceKobo: 20_000_00,
      location: "hotel",
      locationAddonKobo: 1_500_000,
      entitlement: FREE_ENTITLEMENT,
      config: DEFAULT_COMMERCIAL
    });
    expect(spa.surchargeKobo).toBe(0);
    expect(spa.customerTotalKobo).toBe(2_000_000);
    expect(hotel.surchargeKobo).toBe(1_500_000);
    expect(hotel.customerTotalKobo).toBe(3_500_000);
  });

  it("charges 0% commission on active paid plan", () => {
    const now = new Date("2026-06-01");
    const ent = entitlementFromPlan(paidPlan, now, {
      status: "active",
      startsAt: new Date("2026-05-01"),
      endsAt: new Date("2026-07-01"),
      graceUntil: null,
      source: "payment"
    });
    const q = quoteBooking({
      basePriceKobo: 20_000_00,
      location: "spa",
      entitlement: ent,
      config: DEFAULT_COMMERCIAL
    });
    expect(q.commissionKobo).toBe(0);
    expect(q.surchargeKobo).toBe(0);
    expect(q.customerTotalKobo).toBe(2_000_000);
  });

  it("keeps paid entitlements through commercial grace days", () => {
    const ent = entitlementFromPlan(
      paidPlan,
      new Date("2026-07-03"),
      {
        status: "active",
        startsAt: new Date("2026-05-01"),
        endsAt: new Date("2026-07-01"),
        graceUntil: null,
        source: "payment"
      },
      3
    );
    expect(ent.activePaid).toBe(true);
    expect(ent.planCode).toBe("MONTHLY");
  });

  it("restores free entitlements after expiry", () => {
    const ent = entitlementFromPlan(paidPlan, new Date("2026-08-01"), {
      status: "active",
      startsAt: new Date("2026-05-01"),
      endsAt: new Date("2026-07-01"),
      graceUntil: null,
      source: "payment"
    });
    expect(ent.activePaid).toBe(false);
    expect(ent.publicDirectContact).toBe(false);
    expect(ent.commissionBps).toBe(1000);
    expect(ent.unlimitedListings).toBe(true);
  });

  it("never grants public contact on the Free listing plan", () => {
    const ent = entitlementFromPlan(
      { ...paidPlan, code: "FREE", publicDirectContact: true },
      new Date("2026-06-01"),
      {
        status: "active",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("9999-12-31"),
        graceUntil: null,
        source: "default"
      }
    );
    expect(ent.activePaid).toBe(false);
    expect(ent.publicDirectContact).toBe(false);
    expect(publicContactAllowed(ent)).toBe(false);
  });

  it("hides public contact on Free listings", () => {
    const pub = sanitizePublicVendor(
      {
        privatePhone: "+2348011111111",
        privateWhatsapp: "+2348011111111",
        instagramUrl: "@calmhouse",
        owner: { email: "calm@example.com" },
        businessName: "Calm House"
      },
      FREE_ENTITLEMENT
    );
    expect(pub.publicPhone).toBeNull();
    expect(pub.publicWhatsapp).toBeNull();
    expect(pub.publicEmail).toBeNull();
    expect(pub.publicInstagram).toBeNull();
    expect("privatePhone" in pub).toBe(false);
    expect("owner" in pub).toBe(false);
  });

  it("shows WhatsApp, email and Instagram on paid listings", () => {
    const pub = sanitizePublicVendor(
      {
        privatePhone: "+2348011111111",
        privateWhatsapp: "08011111111",
        instagramUrl: "@osunwellness",
        owner: { email: "hello@osun.example" },
        businessName: "Osun Wellness"
      },
      { ...FREE_ENTITLEMENT, publicDirectContact: true, activePaid: true }
    );
    expect(pub.publicPhone).toBe("+2348011111111");
    expect(pub.publicWhatsapp).toBe("https://wa.me/2348011111111");
    expect(pub.publicEmail).toBe("hello@osun.example");
    expect(pub.publicInstagram).toBe("https://www.instagram.com/osunwellness");
    expect(pub.publicDirectContact).toBe(true);
  });

  it("unlocks booking contact only after successful payment", () => {
    expect(bookingUnlocksVendorContact("awaiting_payment", true)).toBe(false);
    expect(bookingUnlocksVendorContact("confirmed", false)).toBe(false);
    expect(bookingUnlocksVendorContact("confirmed", true)).toBe(true);
    expect(bookingUnlocksVendorContact("completed", true)).toBe(true);
  });

  it("builds safe WhatsApp and Instagram links", () => {
    expect(toWhatsAppLink("08011111111")).toBe("https://wa.me/2348011111111");
    expect(toWhatsAppLink(SUPPORT_WHATSAPP)).toBe("https://wa.me/2347039340610");
    expect(supportWhatsAppHref("Hello")).toBe(
      "https://wa.me/2347039340610?text=Hello"
    );
    expect(toInstagramLink("@osun.spa")).toBe("https://www.instagram.com/osun.spa");
    expect(toInstagramLink("https://instagram.com/osun.spa/")).toBe("https://www.instagram.com/osun.spa");
    expect(toInstagramLink("javascript:alert(1)")).toBeNull();
  });
});
