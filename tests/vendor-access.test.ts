import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { vendorNext, vendorCancelPath, vendorReferrerPath } from "../src/lib/vendor-access";
import { middleware } from "../src/middleware";

const mock = vi.hoisted(() => ({ session: vi.fn(), destroy: vi.fn(), headers: vi.fn(), read: vi.fn() }));
vi.mock("../src/lib/auth", () => ({ getSession: mock.session, destroySession: mock.destroy, requireUser: (user: unknown) => {
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
} }));
vi.mock("next/headers", () => ({ headers: mock.headers }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error("REDIRECT:" + href); } }));
vi.mock("../src/lib/db", () => ({ prisma: { vendor: { findUniqueOrThrow: mock.read } } }));
import VendorLogin from "../src/app/(customer)/login/vendor/page";
import VendorAccess from "../src/app/(customer)/vendor-access/page";
import { requireVendor } from "../src/lib/vendor-auth";
import { GET as onboarding } from "../src/app/api/vendor/onboarding/route";

beforeEach(() => {
  vi.clearAllMocks();
  mock.session.mockResolvedValue({ id: "customer", role: "customer", vendorId: "stale-membership" });
  mock.headers.mockResolvedValue(new Headers({ host: "naijaspa.com", referer: "https://naijaspa.com/explore?state=Lagos" }));
});
it("keeps deep vendor destinations but rejects external and non-vendor redirects", () => {
  expect(vendorNext("/vendor/bookings?status=pending")).toBe("/vendor/bookings?status=pending");
  for (const raw of ["https://evil.example", "//evil.example", "/\\evil.example", "/vendor/../api/auth/logout", "/explore", "/vendorish"]) expect(vendorNext(raw)).toBe("/vendor/dashboard");
});
it("returns Cancel to the previous customer page with a safe fallback", () => {
  expect(vendorReferrerPath("https://naijaspa.com/explore?state=Lagos", "naijaspa.com")).toBe("/explore?state=Lagos");
  expect(vendorReferrerPath("https://evil.example/explore", "naijaspa.com")).toBe("/account/dashboard");
  for (const path of ["/vendor/services", "/vendor-access", "/login/vendor", "/register?asVendor=1", "/api/auth/logout", "//evil.example"]) expect(vendorCancelPath(path)).toBe("/account/dashboard");
});
it("overwrites forged destination headers with the actual requested vendor route", () => {
  const result = middleware(new NextRequest("https://naijaspa.com/vendor/bookings?page=2", { headers: { "x-naijaspa-vendor-path": "//evil.example" } }));
  expect(result.headers.get("x-middleware-request-x-naijaspa-vendor-path")).toBe("/vendor/bookings?page=2");
});
it("forwards admin dashboard range onto the login return path", () => {
  const result = middleware(new NextRequest("https://naijaspa.com/admin/dashboard?range=90d", { headers: { "x-naijaspa-admin-path": "//evil.example" } }));
  expect(result.headers.get("x-middleware-request-x-naijaspa-admin-path")).toBe("/admin/dashboard?range=90d");
});
it("sends a signed-in customer to the gate without destroying their session", async () => {
  await expect(VendorLogin({ searchParams: Promise.resolve({ next: "/vendor/services" }) })).rejects.toThrow("REDIRECT:/vendor-access?next=%2Fvendor%2Fservices&back=%2Fexplore%3Fstate%3DLagos");
  expect(mock.destroy).not.toHaveBeenCalled();
});
it("renders the gate for customers while retaining their session", async () => {
  const page = await VendorAccess({ searchParams: Promise.resolve({ next: "/vendor/services", back: "/explore" }) });
  expect(page.props).toMatchObject({ next: "/vendor/services", back: "/explore", roleLabel: "a Customer" });
  expect(mock.destroy).not.toHaveBeenCalled();
});
it("lets vendor owners and staff return directly to their requested destination", async () => {
  for (const role of ["vendor_owner", "vendor_staff"]) {
    mock.session.mockResolvedValue({ role });
    await expect(VendorLogin({ searchParams: Promise.resolve({ next: "/vendor/bookings" }) })).rejects.toThrow("REDIRECT:/vendor/bookings");
  }
});
it("sends guests to vendor login with the requested destination", async () => {
  mock.session.mockResolvedValue(null);
  await expect(VendorAccess({ searchParams: Promise.resolve({ next: "/vendor/bookings" }) })).rejects.toThrow("REDIRECT:/login/vendor?next=%2Fvendor%2Fbookings");
});
it("vendor APIs reject customers even with stale business membership and preserve their session", async () => {
  await expect(requireVendor()).rejects.toMatchObject({ status: 403 });
  expect((await onboarding()).status).toBe(403);
  expect(mock.read).not.toHaveBeenCalled();
  expect(mock.destroy).not.toHaveBeenCalled();
});
