import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, permissions: ["geolocation"] });
    await context.addInitScript(() => {
      sessionStorage.setItem("naijaspa-splash", "1");
      localStorage.setItem("naijaspa-install-dismissed", "1");
      localStorage.setItem("naijaspa_place", JSON.stringify({ state: "FCT", city: "Abuja", neighbourhood: "" }));
      navigator.geolocation.getCurrentPosition = (success) => {
        window.__deliverTestPosition = () => success({ coords: { latitude: 6.5244, longitude: 3.3792 } });
      };
      const fetch = window.fetch;
      window.__testGeoFetches = 0;
      window.fetch = (...args) => {
        if (String(args[0]).includes("/api/geo/reverse")) window.__testGeoFetches++;
        return fetch(...args);
      };
    });
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await context.route("**/account?**", async (route) => { await gate; await route.continue(); });
    await context.route("**/api/geo/reverse?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"state":"Lagos","city":"Lagos","neighbourhood":"Lekki"}' }));
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
    try {
      await page.goto("http://localhost:3000/explore", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof window.__deliverTestPosition === "function");
      const nav = page.getByRole("navigation", { name: width === 1366 ? "Primary" : "Main", exact: true });
      const click = nav.getByRole("link", { name: "Profile", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Opening page…" }).waitFor();
      assert.equal(await page.getByRole("status").filter({ hasText: "Opening page…" }).evaluate((el) => getComputedStyle(el).pointerEvents), "none");
      const attempts = await page.evaluate(() => { window.__deliverTestPosition(); return window.__testGeoFetches; });
      assert.equal(attempts, 0, "Late geolocation callback attempted a refresh while another navigation was pending");
      release(); await click;
      await page.waitForURL("**/account");
      await page.getByRole("heading", { name: "Your wellness, in one place", exact: true }).waitFor();
      console.log(JSON.stringify({ width, check: "single-click-pending-feedback-and-late-location-cannot-interrupt-navigation", ok: true }));
    } finally { release(); await context.close(); }
  }
} finally { await browser.close(); }
