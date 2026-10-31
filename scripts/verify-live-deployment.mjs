import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const credentials = JSON.parse(await readFile(".integration-tests/seeded-login-credentials.json", "utf8"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = "https://naijaspa.com";
try {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addInitScript(() => { sessionStorage.setItem("naijaspa-splash", "1"); localStorage.setItem("naijaspa-install-dismissed", "1"); });
    const page = await context.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    const started = performance.now();
    const response = await page.goto(`${base}/explore`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { name: "5 treatments", exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("article img")].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator("article").count(), 5);
    const elapsed = Math.round(performance.now() - started);
    const nav = page.getByRole("navigation", { name: width === 1366 ? "Primary" : "Main", exact: true });
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/in/"));
    await page.locator("main h1").first().waitFor();
    assert.equal(errors.length, 0, "Public page emitted a runtime error");
    console.log(JSON.stringify({ width, check: "public-https-catalog-images-and-single-click-home", ok: true, catalogReadyMs: elapsed }));
    await context.close();
  }
  const context = await browser.newContext();
  const redirect = await context.request.get("http://naijaspa.com/explore", { maxRedirects: 0 });
  assert.equal(redirect.status(), 301); assert.equal(redirect.headers().location, `${base}/explore`);
  const www = await context.request.get("https://www.naijaspa.com/explore", { maxRedirects: 0 });
  assert.equal(www.status(), 301); assert.equal(www.headers().location, `${base}/explore`);
  for (const [role, path] of [["super_admin", "/admin/dashboard"], ["customer", "/account/dashboard"], ["vendor_owner", "/vendor/dashboard"]]) {
    const account = credentials.find((row) => row.role === role);
    assert(account, `Missing credential handoff for ${role}`);
    try {
      const login = await context.request.post(`${base}/api/auth/login`, { data: { email: account.email, password: account.password, expect: role === "super_admin" ? "admin" : role === "vendor_owner" ? "vendor" : "customer" } });
      assert.equal(login.status(), 200, `Password sign-in failed for ${role}`);
      const page = await context.newPage(); page.setDefaultNavigationTimeout(60000);
      const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200); assert.equal(new URL(page.url()).pathname, path);
      await page.locator("main h1").first().waitFor();
      await page.close();
      console.log(JSON.stringify({ check: `live-password-login:${role}`, ok: true }));
    } finally { await context.request.post(`${base}/api/auth/logout`); }
  }
  assert.equal((await context.request.get("https://padicheck.com/")).status(), 200);
  console.log(JSON.stringify({ check: "canonical-https-and-padicheck-still-healthy", ok: true }));
  await context.close();
} finally { await browser.close(); }
