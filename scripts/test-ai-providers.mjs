// Tests local admin selection, permissions and real Gemini parsing using isolated users.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
assert(process.env.GEMINI_API_KEY?.trim(), "Add GEMINI_API_KEY first");
const base = "http://localhost:3000";
const db = new PrismaClient({ log: [] });
const run = `ai-integration-${crypto.randomBytes(6).toString("hex")}`;
const ids = ["super_admin", "analyst", "customer"].map((role) => `${run}-${role}`);
const keys = ["ai.provider", "ai.model.openai", "ai.model.gemini"];
const before = await db.systemConfig.findMany({ where: { key: { in: keys } } });
const settings = { provider: "gemini", models: {
  openai: process.env.OPENAI_MODEL || "gpt-4o-mini", gemini: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
} };
let written = null;
const password = crypto.randomBytes(20).toString("hex");
const api = async (path, cookie, body, method = body ? "POST" : "GET") => {
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  return { status: response.status, data: await response.json(), headers: response.headers };
};
try {
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [i, role] of ["super_admin", "analyst", "customer"].entries()) {
    await db.user.create({ data: { id: ids[i], email: `${ids[i]}@example.com`, name: "AI integration fixture", role, passwordHash } });
  }
  const cookies = [];
  for (const id of ids) {
    const result = await api("/api/auth/login", null, { email: `${id}@example.com`, password });
    assert.equal(result.status, 200, "Test login failed");
    cookies.push(result.headers.get("set-cookie")?.split(";")[0]);
  }
  const [admin, analyst, customer] = cookies;
  assert.equal((await api("/api/admin/ai", customer)).status, 403);
  assert.equal((await api("/api/admin/ai", analyst)).status, 200);
  assert.equal((await api("/api/admin/ai", analyst, settings, "PUT")).status, 403);
  assert.equal((await api("/api/admin/ai/test", analyst, settings)).status, 403);
  console.log(JSON.stringify({ check: "ai-admin-permissions", ok: true }));
  const panel = await fetch(`${base}/admin/ai`, { headers: { Cookie: admin }, signal: AbortSignal.timeout(60000) });
  assert.equal(panel.status, 200, "Admin AI page failed to render");
  const html = await panel.text();
  assert(html.includes("Google Gemini") && html.includes("OpenAI") && html.includes("Test connection"), "Provider controls missing from admin page");
  assert(!html.includes(process.env.GEMINI_API_KEY), "Gemini key leaked into admin HTML");
  console.log(JSON.stringify({ check: "ai-admin-provider-controls-render", ok: true, credentialsHidden: true }));

  async function select(provider) {
    const value = { ...settings, provider };
    const result = await api("/api/admin/ai", admin, value, "PUT");
    assert.equal(result.status, 200, "Admin save failed");
    written = { "ai.provider": provider, "ai.model.openai": settings.models.openai, "ai.model.gemini": settings.models.gemini };
    const read = await api("/api/admin/ai", admin);
    assert.deepEqual(read.data.settings, value);
    assert(!JSON.stringify(read.data).includes(process.env.GEMINI_API_KEY), "Key leaked from admin response");
    return value;
  }
  if (!process.argv.includes("--ui-only")) {
  await select("gemini");
  const test = await api("/api/admin/ai/test", admin, settings);
  console.log(JSON.stringify({ check: "gemini-real-provider-test", ok: test.status === 200,
    httpStatus: test.status, ...(test.status === 200 ? { filters: test.data.filters } : { error: test.data.error }) }));
  assert.equal(test.status, 200, "Real Gemini provider test failed; see safe diagnostic above");
  const live = await api("/api/ai/search", customer, { message: "Massage in Lagos under ₦500000" });
  assert.equal(live.status, 200);
  assert.equal(live.data.usedFallback, false, "Gemini search unexpectedly fell back");
  assert([live.data.filters.city, live.data.filters.state].includes("Lagos"), "Lagos was not extracted as a city or state");
  console.log(JSON.stringify({ check: "gemini-real-catalog-search", ok: true, usedFallback: live.data.usedFallback, hits: live.data.results.length }));
  await select("local");
  const local = await api("/api/ai/search", customer, { message: "Massage in Lagos" });
  assert.equal(local.status, 200);
  assert.equal(local.data.usedFallback, true);
  console.log(JSON.stringify({ check: "admin-provider-switch-immediate", ok: true, provider: "local" }));
  if (!process.env.OPENAI_API_KEY?.trim()) {
    await select("openai");
    const fallback = await api("/api/ai/search", customer, { message: "Massage in Lagos" });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.data.usedFallback, true);
    console.log(JSON.stringify({ check: "missing-selected-provider-key-fallback", ok: true }));
  }
  }
} catch (error) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "ai-integration", ok: false, code: error.code || error.name,
    detail: error instanceof assert.AssertionError ? error.message : "Credential details omitted" }));
} finally {
  // Restore each setting only if it still has the value written by this test.
  if (written) await db.$transaction(async (tx) => {
    for (const key of keys) {
      const current = await tx.systemConfig.findUnique({ where: { key } });
      if (current?.value !== written[key]) continue;
      const old = before.find((r) => r.key === key);
      if (old) await tx.systemConfig.update({ where: { key }, data: { value: old.value } });
      else await tx.systemConfig.delete({ where: { key } });
    }
  });
  await db.aiSearchLog.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
  console.log(JSON.stringify({ check: "ai-integration-cleanup", ok: true }));
}
