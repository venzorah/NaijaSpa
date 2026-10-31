import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = "http://localhost:3000";
let browser;
try {
  const service = await db.service.findUniqueOrThrow({ where: { slug: "couples-ritual" }, include: { vendor: true, staff: { include: { staff: true } } } });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(60000);
    await page.goto(`${base}/explore`);
    await page.locator('article').filter({ hasText: service.name }).getByRole("link", { name: "View spa service" }).click();
    await page.waitForURL("**/services/couples-ritual");
    await page.getByRole("heading", { level: 1, name: service.vendor.businessName }).waitFor();
    assert((await page.locator("body").innerText()).includes(`With ${service.staff[0].staff.name}`));
    const response = await page.request.get(`${base}/api/availability?serviceId=${service.id}`);
    assert.equal(response.status(), 200);
    const { slots } = await response.json();
    assert(slots.every((value) => new Date(value) > new Date()));
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForFunction(() => !document.body.innerText.includes("Loading available times"));
    const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
    const todaysSlots = slots.filter((value) => new Date(new Date(value).getTime() + 3600000).toISOString().startsWith(today));
    const timeButtons = page.locator("button").filter({ hasText: /^\d{1,2}:\d{2} [AP]M$/ });
    assert.equal(await timeButtons.count(), todaysSlots.length);
    if (todaysSlots.length) {
      await timeButtons.first().click();
      await page.getByRole("button", { name: "Review total", exact: true }).click();
      assert((await page.locator("body").innerText()).includes(today));
    }
    await page.goto(`${base}/explore`);
    const search = page.getByPlaceholder("Search treatments, spas or areas");
    await search.fill("Kemi"); await search.press("Enter");
    await page.waitForURL("**/explore?q=Kemi");
    await page.getByRole("heading", { name: "2 treatments", exact: true }).waitFor();
    await search.fill("no-such-treatment-837291"); await search.press("Enter");
    await page.getByRole("heading", { name: "0 treatments", exact: true }).waitFor();
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await page.waitForURL("**/explore");
    await page.getByRole("heading", { name: "Cities with therapists", exact: true }).waitFor();
    const cityLink = page.locator('section[aria-labelledby="explore-cities"] a').filter({ has: page.getByRole("heading", { name: "Lekki", exact: true }) });
    await cityLink.click();
    await page.waitForURL("**/explore/lagos/lekki");
    const first = page.locator("article").first();
    assert((await first.innerText()).includes("Lekki"));
    console.log(JSON.stringify({ width, checks: "service navigation, database fields, live times, keyword search, empty/clear search, city link and local ranking", ok: true }));
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await db.$disconnect();
}
