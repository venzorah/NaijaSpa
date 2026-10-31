import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database fixtures only");
const base = process.env.EXPLORE_TEST_URL || "http://192.168.109.175:3000";
assert(["192.168.109.175", "localhost", "127.0.0.1"].includes(new URL(base).hostname));
const run = `explore-audit-${randomBytes(6).toString("hex")}`;
const keyword = run.replaceAll("-", "");
const output = path.join(".integration-tests", run);
const db = new PrismaClient({ log: [] });
const userIds = [0, 1, 2, 3].map((i) => `${run}-owner-${i}`);
const vendors = [0, 1, 2, 3].map((i) => `${run}-vendor-${i}`);
const categories = [`${run}-massage`, `${run}-facial`];
const results = [];
let browser;
const services = [
  { id: `${run}-cheap`, vendorId: vendors[0], categoryId: categories[0], name: `${keyword} Cheap`, basePriceKobo: 2000000, durationMin: 60, spaEnabled: true, homeEnabled: true, hotelEnabled: false, rating: 4.9, verified: true, state: "Lagos", gender: "female" },
  ...Array.from({ length: 26 }, (_, i) => ({ id: `${run}-extra-${String(i).padStart(2, "0")}`, vendorId: vendors[0], categoryId: categories[0], name: `${keyword} Treatment ${i}`, basePriceKobo: (21000 + i * 1000) * 100, durationMin: 60, spaEnabled: true, homeEnabled: true, hotelEnabled: false, rating: 4.9, verified: true, state: "Lagos", gender: "female" })),
  { id: `${run}-venue`, vendorId: vendors[1], categoryId: categories[1], name: `${keyword} Venue`, basePriceKobo: 4500000, durationMin: 90, spaEnabled: true, homeEnabled: false, hotelEnabled: true, rating: 3.5, verified: false, state: "Lagos", gender: "male" },
  { id: `${run}-abuja`, vendorId: vendors[2], categoryId: categories[0], name: `${keyword} Abuja`, basePriceKobo: 7500000, durationMin: 120, spaEnabled: false, homeEnabled: true, hotelEnabled: true, rating: 4.4, verified: true, state: "FCT", gender: "female" }
];
function report(check, width) { const result = { check, width, ok: true }; results.push(result); console.log(JSON.stringify(result)); }
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 4; i++) {
    await db.user.create({ data: { id: userIds[i], email: `${userIds[i]}@example.com`, name: "Explore fixture", role: "vendor_owner" } });
    await db.vendor.create({ data: { id: vendors[i], ownerId: userIds[i], slug: vendors[i], businessName: `${keyword} Provider ${i}`, state: i === 2 ? "FCT" : "Lagos", city: i === 2 ? "Abuja" : "Lagos", neighbourhood: "Test", address: "Test", applicationStatus: "approved", visibility: i === 3 ? "hidden" : "public", verificationStatus: i === 1 ? "unverified" : "verified", ratingAvg: i === 0 ? 4.9 : i === 1 ? 3.5 : 4.4 } });
    await db.vendorStaff.create({ data: { id: `${run}-staff-${i}`, vendorId: vendors[i], name: `${keyword} Therapist ${i}`, gender: i === 1 ? "male" : "female" } });
  }
  for (const [i, id] of categories.entries()) await db.category.create({ data: { id, slug: id, name: `Audit category ${i === 0 ? "A" : "B"}`, sortOrder: -100 + i } });
  for (const service of [...services, { ...services[0], id: `${run}-hidden`, vendorId: vendors[3] }]) {
    const { rating: _rating, verified: _verified, state: _state, gender: _gender, ...data } = service;
    const index = vendors.indexOf(data.vendorId);
    await db.service.create({ data: { ...data, slug: data.id, staff: { create: { staffId: `${run}-staff-${index}` } } } });
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addCookies([{ name: "naijaspa_place", value: encodeURIComponent(JSON.stringify({ state: "Lagos", city: "Lagos", neighbourhood: "Lekki" })), url: base }]);
    await context.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
    const page = await context.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
    const href = (extra = {}, place = "") => `${base}/explore${place}?${new URLSearchParams({ q: keyword, ...extra })}`;
    const cards = () => page.locator("article").filter({ hasText: keyword });
    const sidebar = async () => {
      const aside = page.locator("aside:visible").filter({ has: page.getByPlaceholder("Treatment or name", { exact: true }) });
      if (await aside.count() === 0) await page.locator("summary").filter({ hasText: /^Filters$/ }).click();
      await aside.waitFor(); return aside;
    };
    const count = async (expected) => {
      await page.waitForFunction((number) => [...document.querySelectorAll("h2")].some((heading) => new RegExp(`^${number} treatments?\\b`).test(heading.textContent.trim())), expected);
    };
    const ids = async () => cards().evaluateAll((items) => items.map((item) => decodeURIComponent(item.querySelector('a[href^="/services/"]').getAttribute("href").split("/").pop())));
    const check = async (expected) => {
      await count(expected.length); const shown = await ids(); assert.equal(shown.length, Math.min(expected.length, 10));
      const eligible = new Set(expected.map((s) => s.id)); assert(shown.every((id) => eligible.has(id)), "Results contain a listing outside the selected filters");
    };
    const layout = async () => {
      const size = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert(size.document <= size.viewport + 1, `Explore overflows its viewport (${size.document}/${size.viewport})`);
    };
    let stage = "initial-state";
    try {
      await page.goto(href()); await check(services);
      if (process.argv.includes("--pagination-only")) {
        stage = "pagination";
        const params = { category: categories[0], location: "home", sort: "price" };
        const sorted = services.filter((s) => s.state === "Lagos" && s.categoryId === categories[0] && s.homeEnabled)
          .sort((a, b) => a.basePriceKobo - b.basePriceKobo || a.id.localeCompare(b.id));
        await page.goto(href(params, "/lagos"));
        const nav = page.getByRole("navigation", { name: "Treatment pagination" });
        await nav.waitFor();
        assert.deepEqual(await ids(), sorted.slice(0, 10).map((s) => s.id));
        assert.equal(await nav.locator('[aria-disabled="true"]').innerText(), "Previous");
        await nav.getByRole("link", { name: "Next", exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get("page") === "2");
        assert.equal(new URL(page.url()).pathname, "/explore/lagos");
        for (const [key, value] of Object.entries({ q: keyword, ...params })) assert.equal(new URL(page.url()).searchParams.get(key), value);
        await page.getByRole("status").filter({ hasText: "Showing 11–20 of 27" }).waitFor();
        assert.deepEqual(await ids(), sorted.slice(10, 20).map((s) => s.id));
        assert.equal(await nav.locator('[aria-current="page"]').innerText(), "2");
        await nav.getByRole("link", { name: "Page 3", exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get("page") === "3");
        await page.getByRole("status").filter({ hasText: "Showing 21–27 of 27" }).waitFor();
        assert.deepEqual(await ids(), sorted.slice(20).map((s) => s.id));
        assert.equal(await nav.locator('[aria-disabled="true"]').innerText(), "Next");
        await layout();
        await nav.getByRole("link", { name: "Previous", exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get("page") === "2");
        await nav.getByRole("link", { name: "Page 1", exact: true }).click();
        await page.waitForURL((url) => !url.searchParams.has("page"));
        await page.goto(href({ ...params, page: "999" }, "/lagos"));
        assert.equal(new URL(page.url()).searchParams.get("page"), "3");
        await page.getByLabel("Sort by", { exact: true }).selectOption("rating");
        await page.waitForURL((url) => url.searchParams.get("sort") === "rating" && !url.searchParams.has("page"));
        await page.goto(href({ maxPrice: "20000", page: "999" }));
        assert(!new URL(page.url()).searchParams.has("page"));
        assert.equal(await nav.count(), 0);
        assert.equal(await cards().count(), 1);
        await page.goto(`${base}/explore?q=no-such-pagination-fixture-${run}&page=999`);
        assert(!new URL(page.url()).searchParams.has("page"));
        await count(0); assert.equal(await nav.count(), 0);
        report("ten-card-pages-navigation-filter-preservation-bounds-and-empty-results", width);
        continue;
      }
      if (process.argv.includes("--layout-only")) {
        await layout(); report("long-provider-names-fit-viewport", width);
        await page.screenshot({ path: path.join(output, `filters-${width}.png`), fullPage: true });
        continue;
      }
      assert.equal(await (await sidebar()).getByLabel("State", { exact: true }).inputValue(), "");
      report("all-states-and-full-count-despite-saved-location", width);
      stage = "state-filter";
      await (await sidebar()).getByLabel("State", { exact: true }).selectOption("Lagos");
      await page.waitForURL((url) => url.pathname === "/explore/lagos"); await check(services.filter((s) => s.state === "Lagos"));
      await (await sidebar()).getByLabel("State", { exact: true }).selectOption("");
      await page.waitForURL((url) => url.pathname === "/explore"); await check(services);
      await (await sidebar()).getByLabel("State", { exact: true }).selectOption("FCT");
      await page.waitForURL((url) => url.pathname === "/explore/fct"); await check(services.filter((s) => s.state === "FCT"));
      report("state-selection-clearing-and-Abuja", width);
      stage = "specialty-filter";
      await page.goto(href());
      await (await sidebar()).getByRole("button", { name: "Audit category B", exact: true }).click();
      await page.waitForURL((url) => url.searchParams.get("category") === categories[1]); await check(services.filter((s) => s.categoryId === categories[1]));
      await (await sidebar()).getByRole("button", { name: "Audit category B", exact: true }).click();
      await page.waitForURL((url) => !url.searchParams.has("category")); await check(services);
      report("specialty-selection-and-toggle-off", width);
      stage = "service-setting-and-verification";
      for (const [label, setting] of [["Home service", "home"], ["Studio visit", "spa"], ["Spa venue", "hotel"]]) {
        await (await sidebar()).getByRole("button", { name: label, exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get("location") === setting); await check(services.filter((s) => s[`${setting}Enabled`]));
      }
      await (await sidebar()).getByLabel("Verified providers only").click();
      await page.waitForURL((url) => url.searchParams.get("verified") === "1"); await check(services.filter((s) => s.hotelEnabled && s.verified));
      assert(await (await sidebar()).getByLabel("Verified providers only").isChecked());
      report("service-settings-and-combined-verified-filter", width);
      stage = "price-and-reset";
      await page.goto(href());
      let slider = (await sidebar()).getByRole("slider"); const box = await slider.boundingBox(); assert(box);
      await slider.click({ position: { x: box.width * 0.35, y: box.height / 2 } });
      await page.waitForURL((url) => url.searchParams.has("maxPrice"));
      const maxPrice = Number(new URL(page.url()).searchParams.get("maxPrice")); assert(maxPrice > 0 && maxPrice < 80000);
      await check(services.filter((s) => s.basePriceKobo <= maxPrice * 100));
      slider = (await sidebar()).getByRole("slider"); await slider.focus(); await slider.press("Home");
      await page.waitForURL((url) => url.searchParams.get("maxPrice") === "10000"); await check([]);
      await (await sidebar()).getByRole("button", { name: "Reset", exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/explore" && !url.search);
      await page.waitForFunction(() => [...document.querySelectorAll('input[placeholder="Treatment or name"],input[placeholder="Search treatments, spas or areas"]')].every((input) => input.value === "") && [...document.querySelectorAll('input[type="range"]')].every((input) => input.value === "80000"));
      assert.equal(await (await sidebar()).getByLabel("State", { exact: true }).inputValue(), "");
      report("price-pointer-keyboard-and-reset-controls", width);
      stage = "sidebar-search";
      await page.goto(href());
      const sideSearch = (await sidebar()).getByPlaceholder("Treatment or name", { exact: true }); await sideSearch.fill(`${keyword} Cheap`); await sideSearch.press("Enter");
      await page.waitForURL((url) => url.searchParams.get("q") === `${keyword} Cheap`); await check(services.filter((s) => s.id.endsWith("-cheap")));
      report("sidebar-keyword-search", width);
      stage = "sorting-and-pages";
      await page.goto(href()); await page.getByLabel("Sort by", { exact: true }).selectOption("price");
      await page.waitForURL((url) => url.searchParams.get("sort") === "price"); await check(services);
      const sorted = [...services].sort((a, b) => a.basePriceKobo - b.basePriceKobo || a.id.localeCompare(b.id));
      assert.deepEqual(await ids(), sorted.slice(0, 10).map((s) => s.id));
      await page.goto(href({ sort: "price", page: "2" })); await count(services.length); assert.deepEqual(await ids(), sorted.slice(10, 20).map((s) => s.id));
      await page.getByLabel("Sort by", { exact: true }).selectOption("rating");
      await page.waitForURL((url) => url.searchParams.get("sort") === "rating" && !url.searchParams.has("page")); await check(services);
      const rating = [...services].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)); assert.deepEqual(await ids(), rating.slice(0, 10).map((s) => s.id));
      report("global-price-rating-order-and-pagination", width);
      stage = "advanced-filters";
      for (const [extra, expected] of [
        [{ minPrice: "35000", maxPrice: "40000" }, services.filter((s) => s.basePriceKobo >= 3500000 && s.basePriceKobo <= 4000000)],
        [{ gender: "male" }, services.filter((s) => s.gender === "male")],
        [{ minRating: "4.8", duration: "60" }, services.filter((s) => s.rating >= 4.8 && Math.abs(s.durationMin - 60) <= 15)],
        [{ maxPrice: "NaN", minRating: "invalid", page: "invalid", sort: "invalid" }, services]
      ]) { await page.goto(href(extra)); await check(expected); }
      report("advanced-combinations-and-invalid-query-safety", width);
      await layout(); report("long-provider-names-fit-viewport", width);
      await page.screenshot({ path: path.join(output, `filters-${width}.png`), fullPage: true });
    } catch (error) {
      process.exitCode = 1; results.push({ check: "explore-browser", width, stage, ok: false, detail: error.message?.split("\n")[0] });
      console.log(JSON.stringify(results.at(-1))); await page.screenshot({ path: path.join(output, `failure-${width}.png`), fullPage: true }).catch(() => {});
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.category.deleteMany({ where: { id: { in: categories } } });
  await db.$disconnect();
  await writeFile(path.join(output, "results.json"), JSON.stringify({ base, results }, null, 2));
}
