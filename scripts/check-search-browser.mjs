import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname));
const base = "http://localhost:3000";
const db = new PrismaClient({ log: [] });
const run = `search-feature-${crypto.randomBytes(6).toString("hex")}`;
const name = `Feature Search Treatment ${run}`;
const output = path.resolve(".integration-tests", run);
const results = [];
let browser;
try {
  await mkdir(output, { recursive: true });
  await db.user.create({ data: { id: `${run}-owner`, email: `${run}@example.com`, name: "Search fixture", role: "vendor_owner" } });
  await db.vendor.create({ data: { id: run, ownerId: `${run}-owner`, slug: run, businessName: "Feature Search Studio", city: "Lagos", neighbourhood: "Lekki", address: "Feature address", applicationStatus: "approved", visibility: "public" } });
  await db.category.create({ data: { id: run, slug: run, name: "Feature search category", active: true } });
  await db.service.create({ data: { id: run, slug: run, vendorId: run, categoryId: run, name, basePriceKobo: 1000000, durationMin: 60 } });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const width of [1366, 390]) {
    const check = `Browser keyword search filters live catalog (${width}px)`;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => { sessionStorage.setItem("naijaspa-splash", "1"); localStorage.setItem("naijaspa_place", JSON.stringify({ state: "Lagos", city: "Lagos", neighbourhood: "" })); });
    const page = await context.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
    try {
      await page.goto(`${base}/explore/lagos/lagos`);
      const input = page.getByPlaceholder("Search treatments, spas or areas", { exact: true });
      await input.fill(name); await input.press("Enter");
      await page.waitForURL((url) => url.searchParams.get("q") === name);
      await page.getByText(name, { exact: true }).first().waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Search page overflows horizontally");
      await page.screenshot({ path: path.join(output, `search-${width}.png`), fullPage: true });
      const result = { name: check, status: "PASS", detail: "Search form updates URL and returns the exact fixture service" }; results.push(result); console.log(JSON.stringify(result));
      assert.equal(await page.getByText("Recent", { exact: true }).isVisible(), false, "Suggestions still cover results after Enter");
      if (width === 390) {
        const open = await page.getByText("Recent", { exact: true }).isVisible();
        const dropdown = { name: "Search suggestions close after submitting query", status: open ? "FAIL" : "PASS",
          detail: open ? "Recent/trending overlay stays open after Enter and covers the mobile results" : "" };
        results.push(dropdown); console.log(JSON.stringify(dropdown));
        const slots = await db.availabilitySlot.count({ where: { vendorId: run } });
        const card = page.locator("article").filter({ hasText: name }).first();
        const badges = await card.getByText(/^Next:/).count();
        const availability = { name: "Next-available labels reflect actual schedule", status: slots === 0 && badges > 0 ? "FAIL" : "PASS",
          detail: slots === 0 && badges > 0 ? "A vendor with no availability slots displays a fabricated next-appointment time; src/lib/next-slot.ts hashes the listing ID into static labels" : "" };
        results.push(availability); console.log(JSON.stringify(availability));
      }
      await input.fill("Hot stone");
      await input.focus();
      await page.getByRole("button", { name: "Hot stone massage", exact: true }).click();
      await page.waitForURL((url) => url.searchParams.get("q") === "Hot stone massage");
      assert.equal(await page.getByRole("button", { name: "Hot stone massage", exact: true }).isVisible(), false);
      await input.fill(""); await input.focus();
      await page.getByRole("button", { name: "Deep tissue Lekki", exact: true }).focus();
      await page.getByRole("button", { name: "Deep tissue Lekki", exact: true }).press("Enter");
      await page.waitForURL((url) => url.searchParams.get("q") === "Deep tissue Lekki");
      assert.equal(await page.getByText("Recent", { exact: true }).isVisible(), false);
      await page.getByRole("button", { name: "Clear search", exact: true }).click();
      await page.waitForURL((url) => !url.searchParams.has("q"));
      assert.equal(await page.getByText("Recent", { exact: true }).isVisible(), false);
      const interactions = { name: `Search suggestions close after Enter, suggestion, recent item and clear (${width}px)`, status: "PASS", detail: "Each action preserves URL behavior and dismisses the overlay" };
      results.push(interactions); console.log(JSON.stringify(interactions));
    } catch (error) {
      const result = { name: check, status: "FAIL", detail: String(error.message || error.name).slice(0, 400) }; results.push(result); console.log(JSON.stringify(result));
      await page.screenshot({ path: path.join(output, `search-${width}-failure.png`), fullPage: true, timeout: 5000 }).catch(() => {});
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { id: `${run}-owner` } });
  await db.category.deleteMany({ where: { id: run } });
  await db.$disconnect();
  if (process.argv.includes("--standalone")) {
    await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ results: path.join(output, "results.json") }));
  } else {
  const previous = JSON.parse(await readFile(".integration-tests/feature-audit-latest.json", "utf8"));
  const merged = new Map(previous.results.map((r) => [r.name, r]));
  for (const result of results) merged.set(result.name, result);
  previous.results = [...merged.values()];
  previous.counts = Object.fromEntries([...new Set(previous.results.map((r) => r.status))].map((status) => [status, previous.results.filter((r) => r.status === status).length]));
  await writeFile(".integration-tests/feature-audit-latest.json", JSON.stringify(previous, null, 2));
  await writeFile("docs/FEATURE-AUDIT.md", `# NaijaSpa feature audit — 30 October 2026\n\nLocal app: ${base}. API audit plus corrected browser recheck and desktop/mobile search checks.\n\nCounts: ${JSON.stringify(previous.counts)}\n\nTests used isolated local PostgreSQL records and headless Edge. Test records were removed. Payment confirmation events in this audit were synthetic; no new card charge or transfer was made. Page-render checks do not prove every button works.\n\n| Check | Result | Detail |\n|---|---|---|\n${previous.results.map((r) => `| ${r.name.replaceAll("|", "/")} | ${r.status} | ${r.detail.replaceAll("|", "/").replaceAll("\n", " ")} |`).join("\n")}\n\nSearch screenshots: [desktop](../.integration-tests/${run}/search-1366.png), [mobile](../.integration-tests/${run}/search-390.png).\n`);
  console.log(JSON.stringify({ report: "docs/FEATURE-AUDIT.md", counts: previous.counts, screenshots: output }));
  }
  if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
