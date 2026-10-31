import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = "http://127.0.0.1:3101";
const tokens = [];
let browser;
const resultFile = ".category-browser-results.jsonl";
writeFileSync(resultFile, "", { mode: 0o600 });
function report(row) { const line = JSON.stringify(row); appendFileSync(resultFile, `${line}\n`); console.log(line); }
report({ stage: "starting" });
async function context(role, width) {
  const user = await db.user.findFirstOrThrow({ where: { role, status: "active", ...(role === "vendor_owner" ? { vendorOwned: { services: { some: { active: true } } } } : {}) }, select: { id: true } });
  const token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  tokens.push(token);
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 600000) } });
  const ctx = await browser.newContext({ viewport: { width, height: 960 } });
  await ctx.addCookies([{ name: "naijaspa_session", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
  await ctx.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
  return ctx;
}
try {
  browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [1366, 390]) {
    const admin = await context("super_admin", width);
    const page = await admin.newPage(); page.setDefaultTimeout(30000);
    let creates = 0;
    let activates = 0;
    let holdRefresh = false;
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
    await page.route("**/admin/categories?**", async (route) => { if (holdRefresh) await refreshGate; await route.continue().catch(() => {}); });
    await page.route("**/api/admin/categories", async (route) => {
      assert.equal(route.request().method(), "POST");
      const data = route.request().postDataJSON();
      assert.equal(data.name, "Private browser check"); assert(!data.slug);
      creates++; holdRefresh = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ category: { id: "browser-only-draft", slug: "private-browser-check", name: data.name, description: "", synonyms: "", metaTitle: "", metaDescription: "", imageUrl: null, active: false } }) });
    });
    await page.route("**/api/admin/categories/browser-only-draft", async (route) => {
      assert.deepEqual(route.request().postDataJSON(), { active: true }); activates++;
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"category":{"active":true}}' });
    });
    try {
      await page.goto(`${base}/admin/categories`);
      await page.getByRole("button", { name: "New category", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.id === "cat-name");
      await page.getByLabel("Name", { exact: true }).fill("Cancelled draft");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(creates, 0);
      await page.getByRole("button", { name: "New category", exact: true }).click();
      await page.getByLabel("Name", { exact: true }).fill("Private browser check");
      await page.getByRole("button", { name: "Create category", exact: true }).click();
      await page.getByRole("heading", { name: "Edit · Private browser check", exact: true }).waitFor();
      assert.equal(creates, 1); assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Private browser check");
      await page.getByRole("button", { name: "Activate", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((el) => el.textContent === "Category activated."));
      assert.equal(activates, 1);
      report({ check: "category-form-cancel-create-select-and-activate", width, ok: true, writesMocked: true });
    } finally { releaseRefresh(); await admin.close(); }
    const vendor = await context("vendor_owner", width);
    const edit = await vendor.newPage(); edit.setDefaultTimeout(30000);
    let selected;
    let reject = true;
    await edit.route("**/api/vendor/services", async (route) => {
      const body = route.request().postDataJSON();
      selected = body.categoryId;
      await route.fulfill({ status: reject ? 400 : 200, contentType: "application/json", body: reject ? '{"error":"Choose an active treatment category."}' : JSON.stringify({ service: body }) });
    });
    await edit.goto(`${base}/vendor/services`);
    await edit.getByRole("button", { name: /^Edit / }).first().click();
    const options = await edit.locator("#svc-cat option").evaluateAll((items) => items.filter((item) => !item.disabled).map((item) => item.value));
    assert(options.length > 1);
    const previous = await edit.locator("#svc-cat").inputValue();
    const chosen = options.find((value) => value !== previous);
    await edit.locator("#svc-cat").selectOption(chosen);
    await edit.getByRole("button", { name: "Save", exact: true }).click();
    await edit.getByRole("alert").filter({ hasText: "Choose an active treatment category." }).waitFor();
    assert.equal(selected, chosen); assert.equal(await edit.getByRole("dialog").count(), 1);
    reject = false;
    await edit.getByRole("button", { name: "Save", exact: true }).click();
    await edit.getByRole("dialog").waitFor({ state: "detached" }); assert.equal(selected, chosen);
    report({ check: "treatment-category-selection-and-save-error-recovery", width, ok: true, writesMocked: true });
    await vendor.close();
  }
} finally {
  await browser?.close();
  if (tokens.length) await db.session.deleteMany({ where: { token: { in: tokens } } });
  await db.$disconnect();
}
report({ stage: "complete", ok: true });
