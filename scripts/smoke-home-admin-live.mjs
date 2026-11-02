import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
let token, browser, mutations = 0;
try {
  const user = await db.user.findFirstOrThrow({ where: { role: "super_admin", status: "active" }, select: { id: true } });
  token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 300000) } });
  browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    await context.addCookies([{ name: "naijaspa_session", value: token, url: "https://naijaspa.com", httpOnly: true, secure: true, sameSite: "Lax" }]);
    await context.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
    await context.route("**/api/**", route => {
      if (route.request().method() === "GET") return route.continue();
      mutations++; return route.abort("blockedbyclient");
    });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    await page.goto("https://naijaspa.com/admin/hero");
    await page.getByRole("heading", { name: "Premium vendor adverts", exact: true }).waitFor();
    await page.getByRole("button", { name: "Create advert", exact: true }).waitFor();
    await page.goto("https://naijaspa.com/admin/categories");
    await page.getByRole("button", { name: "New category", exact: true }).click();
    await page.getByLabel("Category image", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("https://naijaspa.com/admin/campaigns");
    await page.getByRole("button", { name: "New campaign", exact: true }).click();
    await page.getByLabel("Starts (Nigeria time)", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto("https://naijaspa.com/in/lagos");
    await page.getByRole("heading", { name: "Featured services", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Featured collections", exact: true }).waitFor();
    await page.locator("details summary").first().click();
    assert(await page.locator("details").first().getAttribute("open") !== null);
    const font = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('400 16px Montserrat'); });
    assert(font); assert.equal(mutations, 0);
    console.log(JSON.stringify({ width, publicHttps: true, adminControls: true, homepage: true, font: true, mutations: 0 }));
    await context.close();
  }
  writeFileSync(".home-admin-public-smoke.json", JSON.stringify({ ok: true, publicHttps: true, viewports: [1366, 390], mutations }), { mode: 0o600 });
} finally {
  await browser?.close();
  if (token) await db.session.deleteMany({ where: { token } });
  await db.$disconnect();
}
