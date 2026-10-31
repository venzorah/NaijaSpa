import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = "http://localhost:3000";
let browser;
try {
  const service = await db.service.findUniqueOrThrow({ where: { slug: "couples-ritual" } });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
  const missing = "explore-audit-removed-treatment";
  let response = await page.request.get(`${base}/api/quote?serviceId=${missing}&location=spa`);
  assert.equal(response.status(), 404);
  assert(!(await response.text()).includes("prisma"));
  await page.goto(`${base}/book/${missing}`);
  await page.locator('p[role="alert"]').waitFor();
  assert(await page.getByRole("button", { name: "Continue to payment", exact: true }).isDisabled());
  assert.equal(await page.getByRole("link", { name: "Back to Explore" }).getAttribute("href"), "/explore");
  await page.goto(`${base}/services/${service.slug}`);
  response = await page.request.get(`${base}/api/availability?serviceId=${service.id}`);
  const { slots } = await response.json(); assert(slots.length > 0);
  const first = new Date(slots[0]);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short" }).format(first);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "2-digit" }).format(first);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`${weekday}\\s*${day}`) }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Loading available times"));
  await page.locator("aside button").filter({ hasText: /^\d{1,2}:\d{2} [AP]M$/ }).first().click();
  await page.getByRole("button", { name: "Review total", exact: true }).click();
  // Simulate the service disappearing while its detail page is already open.
  const unavailable = "This service is no longer available. Please choose another treatment from Explore.";
  await page.route("**/api/quote?**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: unavailable }) }));
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await page.locator('p[role="alert"]').waitFor(); assert(new URL(page.url()).pathname.startsWith("/services/"));
  await page.unroute("**/api/quote?**");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await page.waitForURL(`**/book/${service.id}?**`);
  const pay = page.getByRole("button", { name: "Continue to payment", exact: true });
  await page.waitForFunction(() => !document.querySelector('form button').disabled);
  assert((await page.locator("body").innerText()).includes("72,000"));
  // Verify recovery from a network failure without creating or charging a booking.
  await page.route("**/api/bookings", (route) => route.abort("failed"));
  await pay.click(); await page.locator('p[role="alert"]').waitFor(); assert(await pay.isEnabled());
  await page.unroute("**/api/bookings");
  await pay.click(); await page.waitForURL("**/login?next=**");
  console.log(JSON.stringify({ ok: true, checks: "missing quote 404, unavailable review blocks payment, stale detail preflight, retained service continuation and correct price, network retry, login continuation", recordsCreated: 0, paymentsInitiated: 0 }));
} finally {
  if (browser) await browser.close();
  await db.$disconnect();
}
