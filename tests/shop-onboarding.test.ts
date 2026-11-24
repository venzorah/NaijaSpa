import { expect, it } from "vitest";
import {
  canDraftShopProducts,
  inferShopOnboardingStep,
  shopOnboardingIncomplete
} from "../src/lib/shop/onboarding";

it("starts product onboarding at email OTP until the address is verified", () => {
  expect(
    inferShopOnboardingStep({
      shopStatus: "none",
      businessName: "Oils by Ada",
      city: "Lagos",
      address: "12 Admiralty",
      logoUrl: "/logo.jpg",
      coverUrl: "/cover.jpg",
      docCount: 1,
      emailVerified: false
    })
  ).toBe(0);
});

it("resumes at the first unfinished shop onboarding section after email is verified", () => {
  expect(
    inferShopOnboardingStep({
      shopOnboardingStep: 0,
      shopStatus: "none",
      businessName: "Oils by Ada",
      city: "Lagos",
      address: "12 Admiralty",
      logoUrl: null,
      coverUrl: null,
      docCount: 0,
      emailVerified: true
    })
  ).toBe(2);
  expect(
    inferShopOnboardingStep({
      shopOnboardingStep: 1,
      shopStatus: "none",
      businessName: "Oils by Ada",
      city: "Lagos",
      address: "12 Admiralty",
      logoUrl: "/api/media/galleries/v/logo.jpg",
      coverUrl: "/api/media/galleries/v/cover.jpg",
      docCount: 1,
      emailVerified: true
    })
  ).toBe(4);
});

it("lets product sellers list drafts after they submit, not before", () => {
  expect(canDraftShopProducts("none")).toBe(false);
  expect(canDraftShopProducts("pending")).toBe(true);
  expect(
    shopOnboardingIncomplete("products", {
      shopStatus: "pending",
      businessName: "Oils by Ada",
      city: "Lagos",
      address: "12 Admiralty",
      logoUrl: "/logo.jpg",
      coverUrl: "/cover.jpg",
      docCount: 1,
      emailVerified: true
    })
  ).toBe(false);
});
