import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
let token, browser;
try {
  const user = await db.user.findFirstOrThrow({ where: { role: "super_admin", status: "active" }, select: { id: true } });
  token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 300000) } });
  browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 960 } });
  await context.addCookies([{ name: "naijaspa_session", value: token, url: "https://naijaspa.com", httpOnly: true, secure: true, sameSite: "Lax" }]);
  let mutations = 0;
  await context.route("**/api/**", (route) => {
    if (route.request().method() === "GET") return route.continue();
    mutations++; return route.abort("blockedbyclient");
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto("https://naijaspa.com/admin/categories");
  await page.getByRole("button", { name: "New category", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === "cat-name");
  await page.getByRole("button", { name: "Create category", exact: true }).click();
  assert(await page.locator("#cat-name").evaluate((input) => input.validity.valueMissing));
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(mutations, 0);
  await writeFile(".category-public-smoke.json", JSON.stringify({ ok: true, publicHttps: true, newFormVerified: true, emptyNameBlocked: true, businessMutations: mutations }), { mode: 0o600 });
} finally {
  await browser?.close();
  if (token) await db.session.deleteMany({ where: { token } });
  await db.$disconnect();
}
