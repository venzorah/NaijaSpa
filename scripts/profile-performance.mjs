import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
const sqlDurations = [];
db.$on("query", (event) => sqlDurations.push(event.duration));
const tokens = [];
const base = "http://localhost:3000";
const report = { memory: { totalMb: Math.round(os.totalmem() / 1048576), freeMb: Math.round(os.freemem() / 1048576) }, database: [], http: [], browser: [] };
let browser;
async function tokenFor(role) {
  const user = await db.user.findFirstOrThrow({ where: { role, status: "active", deletionRequestedAt: null }, select: { id: true } });
  const token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("20m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 1200000) } });
  tokens.push(token); return token;
}
try {
  for (let i = 0; i < 5; i++) {
    const started = performance.now(); await db.$queryRaw`SELECT 1`;
    report.database.push({ round: i + 1, wallMs: Math.round(performance.now() - started), sqlMs: sqlDurations.at(-1) });
  }
  console.log(JSON.stringify({ database: report.database, memory: report.memory }));
  const customer = await tokenFor("customer"); const admin = await tokenFor("super_admin");
  const routes = [["/in/fct/abuja", null], ["/explore", null], ["/services/couples-ritual", null], ["/account/dashboard", customer], ["/account/settings", customer], ["/admin/dashboard", admin], ["/admin/applications", admin]];
  for (const [pathname, token] of routes) {
    for (let round = 1; round <= 2; round++) {
      const started = performance.now();
      const response = await fetch(`${base}${pathname}`, { headers: token ? { Cookie: `naijaspa_session=${token}` } : {}, signal: AbortSignal.timeout(90000) });
      const headersMs = Math.round(performance.now() - started);
      const body = await response.arrayBuffer();
      const row = { pathname, round, status: response.status, headersMs, totalMs: Math.round(performance.now() - started), htmlKb: Math.round(body.byteLength / 1024) };
      report.http.push(row); console.log(JSON.stringify(row));
    }
  }
  if (!process.argv.includes("--http-only")) {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    for (const pathname of ["/explore", "/admin/dashboard"]) {
      const context = await browser.newContext();
      await context.addCookies([{ name: "naijaspa_session", value: admin, url: base, httpOnly: true, sameSite: "Lax" }]);
      await context.addInitScript(() => { sessionStorage.setItem("naijaspa-splash", "1"); localStorage.setItem("naijaspa-install-dismissed", "1"); });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(90000); page.setDefaultTimeout(90000);
      const started = performance.now();
      await page.goto(`${base}${pathname}`, { waitUntil: "domcontentloaded" }); await page.locator("main h1").first().waitFor();
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        const total = (kind) => resources.filter((r) => kind(r)).reduce((n, r) => n + r.decodedBodySize, 0);
        return { documentMs: Math.round(nav.responseEnd - nav.startTime), domReadyMs: Math.round(nav.domContentLoadedEventEnd), scriptKb: Math.round(total((r) => r.initiatorType === "script") / 1024), imageKb: Math.round(total((r) => r.initiatorType === "img") / 1024), resources: resources.length };
      });
      const row = { pathname, headingReadyMs: Math.round(performance.now() - started), ...metrics }; report.browser.push(row); console.log(JSON.stringify(row));
      await context.close();
    }
  }
} finally {
  await browser?.close();
  if (tokens.length) await db.session.deleteMany({ where: { token: { in: tokens } } });
  await db.$disconnect();
  await mkdir(".integration-tests", { recursive: true });
  await writeFile(`.integration-tests/performance-${process.argv.includes("--after") ? "after" : "before"}.json`, JSON.stringify(report, null, 2));
}
