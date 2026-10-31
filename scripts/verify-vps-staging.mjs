import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const Redis = require("ioredis");
const db = new PrismaClient({ log: [] });
const tokens = [];
const base = "http://127.0.0.1:3100";
const results = [];
const report = (check, extra = {}) => { const row = { check, ok: true, ...extra }; results.push(row); console.log(JSON.stringify(row)); };
let redis;
async function get(path, token) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, { headers: token ? { Cookie: `naijaspa_session=${token}` } : {}, signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  assert.equal(response.status, 200, `Unexpected status on ${path}`);
  return { text, ms: Math.round(performance.now() - started), url: response.url };
}
try {
  assert.equal(process.env.NODE_ENV, "production");
  assert.equal(process.env.APP_URL, "https://naijaspa.com");
  const services = await db.service.count({ where: { active: true, vendor: { visibility: "public", applicationStatus: "approved" } } });
  for (const path of ["/", "/explore", "/services/couples-ritual", "/login", "/login/admin"]) {
    const page = await get(path);
    assert(!page.text.includes("Application error:"));
    if (path === "/explore") assert(page.text.includes("Couples ritual"));
    report(`page:${path}`, { ms: page.ms });
  }
  const service = await db.service.findUniqueOrThrow({ where: { slug: "couples-ritual" } });
  const quote = JSON.parse((await get(`/api/quote?serviceId=${service.id}&location=spa`)).text);
  assert.equal(quote.basePriceKobo, service.basePriceKobo); report("stored-service-price");
  const availability = JSON.parse((await get(`/api/availability?serviceId=${service.id}`)).text);
  assert(availability.slots.every((date) => new Date(date) > new Date())); report("real-availability", { slots: availability.slots.length });
  redis = new Redis(process.env.REDIS_URL, { connectTimeout: 3000, maxRetriesPerRequest: 0 });
  assert.equal(await redis.ping(), "PONG"); report("isolated-redis");
  for (const role of ["super_admin", "customer", "vendor_owner"]) {
    const user = await db.user.findFirstOrThrow({ where: { role, status: "active" } });
    const token = await new SignJWT({ id: user.id }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    tokens.push(token);
    await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 300000) } });
    const path = role === "super_admin" ? "/admin/dashboard" : role === "vendor_owner" ? "/vendor/dashboard" : "/account/dashboard";
    const page = await get(path, token);
    assert.equal(new URL(page.url).pathname, path);
    report(`migrated-account:${role}`, { ms: page.ms });
  }
  const admins = await db.user.findMany({ where: { role: { notIn: ["customer", "vendor_owner", "vendor_staff"] } }, select: { passwordHash: true } });
  const defaults = await Promise.all(admins.map((user) => user.passwordHash ? bcrypt.compare("NaijaSpa!dev", user.passwordHash) : false));
  report("migration-summary", { activePublicServices: services, importedPrivilegedAccountsWithDevelopmentPassword: defaults.filter(Boolean).length, paymentMode: process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_") ? "test" : "other", uploads: process.env.UPLOAD_STORAGE });
} finally {
  await redis?.quit();
  if (tokens.length) await db.session.deleteMany({ where: { token: { in: tokens } } });
  await db.$disconnect();
}
