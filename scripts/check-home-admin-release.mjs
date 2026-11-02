import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { writeFileSync, appendFileSync } from "node:fs";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = "http://127.0.0.1:3101";
const resultFile = ".home-admin-browser-results.jsonl";
writeFileSync(resultFile, "", { mode: 0o600 });
const report = row => { const line = JSON.stringify(row); appendFileSync(resultFile, `${line}\n`); console.log(line); };
const tokens = [], fixtures = { categories: [], campaigns: [], ads: [] };
let browser;
async function session(role) {
  const user = await db.user.findFirstOrThrow({ where: { role, status: "active" }, select: { id: true } });
  const token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 900000) } });
  tokens.push(token); return token;
}
async function api(token, path, method, data) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: `naijaspa_session=${token}`, ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {}) });
  const payload = await response.json(); assert.equal(response.status, 200, payload.error || path); return payload;
}
try {
  const admin = await session("super_admin"), customer = await session("customer");
  const vendor = await db.vendor.findFirstOrThrow({ where: { applicationStatus: "approved", visibility: "public", services: { some: { active: true } } }, select: { id: true, services: { where: { active: true }, select: { id: true }, take: 1 } } });
  const title = `Private release check ${randomUUID()}`;
  const campaignBody = { vendorId: vendor.id, serviceId: vendor.services[0].id, placement: "homepage_featured", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(), priority: 0, active: false };
  const { campaign } = await api(admin, "/api/admin/campaigns", "POST", campaignBody); fixtures.campaigns.push(campaign.id);
  await api(admin, `/api/admin/campaigns/${campaign.id}`, "PATCH", { priority: 3 });
  assert.equal((await db.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).priority, 3);
  await api(admin, `/api/admin/campaigns/${campaign.id}`, "DELETE");
  const { ad } = await api(admin, "/api/admin/hero/ads", "POST", { title, imageUrl: "/photos/spa.jpg", ctaHref: "/explore", active: false }); fixtures.ads.push(ad.id);
  await api(admin, `/api/admin/hero/ads/${ad.id}`, "PUT", { title: `${title} edited` });
  assert.equal((await db.heroAd.findUniqueOrThrow({ where: { id: ad.id } })).active, false);
  await api(admin, `/api/admin/hero/ads/${ad.id}`, "DELETE");
  const form = new FormData(); form.set("name", title); form.set("slug", "");
  form.set("file", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64")], { type: "image/png" }), "test.png");
  const { category } = await api(admin, "/api/admin/categories", "POST", form); fixtures.categories.push(category.id);
  assert.equal(category.active, false); assert(category.imageUrl?.startsWith("/api/media/categories/"));
  const image = await fetch(`${base}${category.imageUrl}`); assert.equal(image.status, 200); assert.match(image.headers.get("content-type"), /^image\/png/);
  for (const path of ["/api/admin/campaigns", "/api/admin/hero/ads", "/api/admin/categories"]) {
    const denied = await fetch(`${base}${path}`, { method: "POST", headers: { Cookie: `naijaspa_session=${customer}`, "Content-Type": "application/json" }, body: JSON.stringify({}) }); assert.equal(denied.status, 403);
  }
  report({ check: "real-crud-inactive-fixtures-image-r2-and-access-control", ok: true });
  browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addCookies([{ name: "naijaspa_session", value: admin, url: base, httpOnly: true, sameSite: "Lax" }]);
    await context.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    await page.goto(`${base}/admin/categories`);
    await page.getByRole("button", { name: "New category", exact: true }).click();
    await page.getByLabel("Category image", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto(`${base}/admin/campaigns`);
    await page.getByRole("button", { name: "New campaign", exact: true }).click();
    await page.getByLabel("Starts (Nigeria time)", { exact: true }).waitFor();
    await page.locator('select[name="placement"]').selectOption("homepage_premium");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("link", { name: "Manage homepage adverts", exact: true }).click();
    await page.getByRole("heading", { name: "Premium vendor adverts", exact: true }).waitFor();
    await page.getByRole("button", { name: "Create advert", exact: true }).waitFor();
    // Browser saves use mocked endpoints; real API persistence is checked above with inactive fixtures.
    let created = false;
    await page.route("**/api/admin/hero/ads", async route => { created = true; assert.equal(route.request().postDataJSON().title, "Browser advert check"); await route.fulfill({ status: 200, contentType: "application/json", body: '{"ad":{"id":"browser-only"}}' }); });
    const newForm = page.locator("section").filter({ has: page.getByRole("heading", { name: "Create a homepage advert", exact: true }) }).locator("form");
    await newForm.getByLabel("Advert title", { exact: true }).fill("Browser advert check");
    await newForm.getByRole("button", { name: "Create advert", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Saved." }).waitFor(); assert(created);
    await page.goto(`${base}/in/lagos`);
    await page.getByRole("heading", { name: "Featured services", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Recommended for you", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Featured collections", exact: true }).waitFor();
    assert(await page.locator('a[href^="/services/"]').count() > 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "Homepage overflows viewport");
    await page.screenshot({ path: `.home-admin-${width}.png`, fullPage: true });
    await page.goto(`${base}/in/fct`);
    await page.getByRole("link", { name: "Browse all locations", exact: false }).waitFor();
    report({ check: "admin-controls-and-live-homepage", width, ok: true });
    await context.close();
  }
} finally {
  await browser?.close();
  // Exact fixture IDs only; existing records and audit history are preserved.
  for (const id of fixtures.categories) {
    const category = await db.category.findUnique({ where: { id }, select: { imageUrl: true } });
    if (category?.imageUrl) {
      const { DeleteObjectCommand, S3Client } = require("@aws-sdk/client-s3");
      const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
      await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `categories/${decodeURIComponent(category.imageUrl.split("/").pop())}` })); client.destroy();
    }
    await db.category.deleteMany({ where: { id } });
  }
  await db.campaign.deleteMany({ where: { id: { in: fixtures.campaigns } } });
  await db.heroAd.deleteMany({ where: { id: { in: fixtures.ads } } });
  await db.session.deleteMany({ where: { token: { in: tokens } } });
  await db.$disconnect();
}
report({ stage: "complete", ok: true, fixturesRemoved: true });
