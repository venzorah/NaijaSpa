import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
let token;
let browser;
try {
  const user = await db.user.findFirstOrThrow({ where: { role: "vendor_owner", name: { contains: "oluwalana", mode: "insensitive" } }, select: { id: true } });
  token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
  await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 900000) } });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: "naijaspa_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
  await page.goto("http://localhost:3000/vendor/dashboard", { waitUntil: "domcontentloaded" });
  await page.getByText("Not visible yet", { exact: true }).waitFor();
  await page.getByText("Your application is awaiting admin approval.", { exact: true }).waitFor();
  for (const [label, href] of [["Add an active treatment", "/vendor/services"], ["Add yourself as a therapist", "/vendor/staff"], ["Set your working hours", "/vendor/availability"]]) {
    assert.equal(await page.getByRole("link", { name: label, exact: true }).getAttribute("href"), href);
  }
  console.log(JSON.stringify({ check: "actual-specialist-dashboard-shows-publication-blockers-and-setup-links", ok: true, listingChanged: false }));
} finally {
  await browser?.close();
  if (token) await db.session.deleteMany({ where: { token } });
  await db.$disconnect();
}
