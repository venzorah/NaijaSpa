import { createRequire } from "node:module";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
let browser;
let testToken;
try {
  const users = await db.user.findMany({ where: { OR: [{ name: { contains: "oluwalana", mode: "insensitive" } }, { name: { contains: "simon", mode: "insensitive" } }] }, select: { name: true, role: true, status: true, vendorOwned: { select: { id: true, slug: true, businessName: true, state: true, city: true, visibility: true, applicationStatus: true, verificationStatus: true, services: { select: { name: true, active: true } }, staff: { select: { name: true, active: true } }, documents: { select: { kind: true, status: true } } } } } });
  for (const user of users) {
    const vendor = user.vendorOwned;
    console.log(JSON.stringify({ account: user.name, role: user.role, accountStatus: user.status, vendor, workingHours: vendor ? await db.availabilitySlot.count({ where: { vendorId: vendor.id } }) : 0 }));
  }
  if (process.argv.includes("--account-only")) process.exitCode = 0;
  else {
    const admin = await db.user.findFirst({ where: { role: "super_admin", status: "active", deletionRequestedAt: null }, select: { id: true } });
    assert(admin, "No active super-admin account available for read-only sidebar checks");
    testToken = await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
    await db.session.create({ data: { userId: admin.id, token: testToken, expiresAt: new Date(Date.now() + 900000) } });
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 960 } });
    await context.addCookies([{ name: "naijaspa_session", value: testToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
    await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor();
    console.log(JSON.stringify({ stage: "admin-dashboard-ready" }));
    const links = await page.locator('aside nav a').evaluateAll((items) => items.map((a) => ({ href: a.getAttribute("href"), label: a.textContent.trim() })));
    assert(links.length > 0, "Admin sidebar not available");
    const desktopLinks = process.argv.includes("--mobile-only") ? [] : links;
    for (const link of desktopLinks) {
      const started = Date.now();
      await page.locator(`aside nav a[href="${link.href}"]`).click();
      await page.waitForURL(`**${link.href}`);
      await page.locator("main h1").first().waitFor();
      const body = await page.locator("main").innerText();
      assert(!body.includes("Application error"));
      console.log(JSON.stringify({ href: link.href, singleClick: true, elapsedMs: Date.now() - started }));
    }
    await page.getByLabel("Screen", { exact: true }).selectOption("vendors");
    await page.waitForURL("**/admin/vendors");
    console.log(JSON.stringify({ check: "screen-switcher", ok: true }));
    await page.setViewportSize({ width: 390, height: 960 });
    for (const href of ["/admin/applications", "/admin/services", "/admin/dashboard"]) {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await page.getByRole("dialog", { name: "Navigation", exact: true }).locator(`nav a[href="${href}"]`).click();
      await page.waitForURL(`**${href}`);
      assert.equal(await page.getByRole("dialog", { name: "Navigation", exact: true }).count(), 0);
      await page.locator("main h1").first().waitFor();
      console.log(JSON.stringify({ href, singleClick: true, width: 390 }));
    }
  }
} finally {
  await browser?.close();
  if (testToken) await db.session.deleteMany({ where: { token: testToken } });
  await db.$disconnect();
}
