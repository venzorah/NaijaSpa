import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = "http://localhost:3000";
const tokens = [];
let browser;
const report = (check, width) => console.log(JSON.stringify({ check, width, ok: true }));
async function contextFor(role, width) {
  const user = await db.user.findFirstOrThrow({ where: { role, status: "active", deletionRequestedAt: null }, select: { id: true } });
  const token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
  tokens.push(token);
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 900000) } });
  const context = await browser.newContext({ viewport: { width, height: 960 }, permissions: ["geolocation"], geolocation: { latitude: 9.0765, longitude: 7.3986 } });
  await context.addCookies([{ name: "naijaspa_session", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
  await context.addInitScript(() => {
    sessionStorage.setItem("naijaspa-splash", "1");
    localStorage.setItem("naijaspa-install-dismissed", "1");
    localStorage.setItem("naijaspa_place", JSON.stringify({ state: "FCT", city: "Abuja", neighbourhood: "" }));
  });
  // Button checks must not write profile, theme, payment or business data.
  await context.route("**/api/**", (route) => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  return context;
}
async function clickOnce(page, locator, pathname) {
  await locator.click();
  await page.waitForURL((url) => url.pathname === pathname);
  await page.locator("main h1").first().waitFor();
  assert(!(await page.locator("main").innerText()).includes("This page could not be found"), `Broken destination: ${pathname}`);
}
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const width of process.argv.includes("--admin-only") ? [] : [1366, 390]) {
    const context = await contextFor("customer", width);
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
    let geoReads = 0;
    await context.route("**/api/geo/reverse?**", (route) => { geoReads++; return route.fulfill({ status: 200, contentType: "application/json", body: '{"state":"FCT","city":"Abuja","neighbourhood":""}' }); });
    await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor();
    if (width === 1366 && !process.argv.includes("--navigation-only")) {
      const links = await page.locator('main section a').evaluateAll((items) => items.map((a) => a.getAttribute("href")));
      for (const href of links) {
        await clickOnce(page, page.locator(`main section a[href="${href}"]`).first(), href);
        report(`profile-link:${href}`, width);
        await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
      }
    }
    const nav = width === 1366 ? page.getByRole("navigation", { name: "Primary", exact: true }) : page.getByRole("navigation", { name: "Main", exact: true });
    for (const [label, href] of [["Bookings", "/account/bookings"], ["Favourites", "/account/favourites"], ["Profile", "/account"], ["Explore", "/explore"]]) {
      await clickOnce(page, nav.getByRole("link", { name: label, exact: true }), href);
      report(`navigation:${label}`, width);
    }
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname.startsWith("/in/"));
    await page.locator("main h1").first().waitFor();
    report("navigation:Home", width);
    assert(geoReads <= 1, "Location detection repeats on every customer navigation");
    if (process.argv.includes("--navigation-only")) { await context.close(); continue; }
    // Returning a default location must not launch another lookup on the next route.
    await clickOnce(page, nav.getByRole("link", { name: "Profile", exact: true }), "/account");
    await clickOnce(page, page.getByRole("link", { name: "Overview", exact: true }), "/account/dashboard");
    await clickOnce(page, page.getByRole("link", { name: "See all", exact: true }), "/account/bookings");
    report("dashboard-see-all", width);
    await page.goto(`${base}/account/settings`, { waitUntil: "domcontentloaded" });
    const theme = page.getByRole("button", { name: /Switch to (Dark|Light) Mode/ });
    const before = await page.locator("html").getAttribute("class"); await theme.click();
    await page.waitForFunction((old) => document.documentElement.className !== old, before);
    report("theme-button", width);
    // Check rejected storage does not break the theme button.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
    const beforeBlocked = await page.locator("html").getAttribute("class"); await theme.click();
    await page.waitForFunction((old) => document.documentElement.className !== old, beforeBlocked);
    report("theme-with-storage-blocked", width);
    let releaseSave;
    const saveGate = new Promise((resolve) => { releaseSave = resolve; });
    let saveRequests = 0;
    await page.route("**/api/account/profile", async (route) => { saveRequests++; await saveGate; await route.abort("failed"); });
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    assert(await page.getByRole("button", { name: "Saving…", exact: true }).isDisabled());
    releaseSave();
    await page.getByText("Could not save profile. Please try again.", { exact: true }).waitFor();
    assert.equal(saveRequests, 1); assert(await page.getByRole("button", { name: "Save changes", exact: true }).isEnabled());
    report("profile-submit-progress-and-network-recovery", width);
    // A failed logout remains retryable and sends one request.
    let releaseLogout;
    const logoutGate = new Promise((resolve) => { releaseLogout = resolve; });
    let logoutRequests = 0;
    await page.route("**/api/auth/logout", async (route) => { logoutRequests++; await logoutGate; await route.abort("failed"); });
    await page.getByRole("button", { name: "Log Out", exact: true }).last().click();
    assert(await page.getByRole("button", { name: "Signing out", exact: true }).isDisabled());
    releaseLogout(); await page.getByText("Retry Log Out", { exact: true }).waitFor(); assert.equal(logoutRequests, 1);
    report("logout-progress-and-network-recovery", width);
    await context.close();
  }
  if (!process.argv.includes("--navigation-only")) {
  const adminContext = await contextFor("super_admin", 1366);
  const admin = await adminContext.newPage(); admin.setDefaultTimeout(60000); admin.setDefaultNavigationTimeout(60000);
  await admin.goto(`${base}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await admin.getByRole("group", { name: "Date range" }).getByRole("button", { name: "7 days", exact: true }).click();
  await admin.waitForURL("**/admin/dashboard?range=7d");
  await admin.waitForFunction(() => [...document.querySelectorAll('button[aria-pressed="true"]')].some((button) => button.textContent.trim() === "7 days"));
  report("admin-date-range-button", 1366);
  await clickOnce(admin, admin.locator('main a[href="/admin/vendors"]').first(), "/admin/vendors");
  await admin.getByRole("button", { name: "Create vendor", exact: true }).click();
  await admin.getByRole("heading", { name: "Create vendor", exact: true }).waitFor();
  await admin.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await admin.getByRole("heading", { name: "Create vendor", exact: true }).count(), 0);
  report("admin-dashboard-card-and-open-cancel-form", 1366);
  const priorHeading = await admin.locator("main h2").last().textContent();
  await admin.getByRole("group", { name: "Filter by status", exact: true }).getByRole("button", { name: /^Suspended/ }).click();
  assert(!(await admin.locator("main").innerText()).includes("Owner email"), "An empty vendor filter kept a previous vendor's details");
  if (priorHeading) assert.equal(await admin.getByRole("heading", { name: priorHeading, exact: true }).count(), 0);
  report("admin-filter-clears-unmatched-detail", 1366);
  await admin.goto(`${base}/admin/services`, { waitUntil: "domcontentloaded" });
  await admin.getByRole("group", { name: "Moderation queue" }).getByRole("button", { name: /^Live/ }).click();
  await admin.getByRole("group", { name: "Moderation queue" }).getByRole("button", { name: /^Hidden \/ pending/ }).click();
  await admin.getByText("Nothing in this queue", { exact: true }).waitFor();
  await admin.getByText("Nothing to review", { exact: true }).waitFor();
  report("admin-service-filter-does-not-keep-live-record", 1366);
  await adminContext.close();
  }
} finally {
  await browser?.close();
  if (tokens.length) await db.session.deleteMany({ where: { token: { in: tokens } } });
  await db.$disconnect();
}
