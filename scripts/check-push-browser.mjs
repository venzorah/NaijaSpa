import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { SignJWT } from "jose";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname));
const base = "http://localhost:3000";
const id = `push-browser-${randomBytes(8).toString("hex")}`;
const token = await new SignJWT({ id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
const db = new PrismaClient({ log: [] });
let browser;
let stage = "fixture";
try {
  await db.user.create({ data: { id, email: `${id}@example.com`, name: "Push test", role: "customer", sessions: { create: { token, expiresAt: new Date(Date.now() + 600_000) } } } });
  stage = "launch";
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ permissions: ["notifications"] });
  await context.addCookies([{ name: "naijaspa_session", value: token, url: base }]);
  await context.addInitScript(() => sessionStorage.setItem("naijaspa-splash", "1"));
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  stage = "settings-page";
  await page.goto(`${base}/account/settings`, { timeout: 60000 });
  const button = page.getByRole("button", { name: "Test on this device", exact: true });
  stage = "device-test-button";
  await button.waitFor();
  await button.click();
  const status = page.getByRole("status");
  stage = "device-test-result";
  await status.waitFor();
  const message = await status.textContent();
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return { permission: Notification.permission, worker: registration?.active?.state || null, notifications: (await registration?.getNotifications({ tag: "naijaspa-device-test" }))?.length || 0 };
  });
  console.log(JSON.stringify({ check: "push-browser-device-test", ...state, message }));
  assert.equal(state.worker, "activated");
  assert(message?.includes("browser created the device test") || message?.includes("browser did not retain"), "Device test failed before display");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    for (const notification of await registration.getNotifications()) notification.close();
  });
} catch (error) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "push-browser-device-test", ok: false, stage, detail: error.message?.split("\n")[0] || error.name }));
} finally { await browser?.close(); await db.user.deleteMany({ where: { id } }); await db.$disconnect(); }
