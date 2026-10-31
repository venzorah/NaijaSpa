import { loadEnvConfig } from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
loadEnvConfig(process.cwd());
async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim(), token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const tcp = Boolean(process.env.REDIS_URL?.trim());
  if (!tcp && (!url || !token)) { console.log(JSON.stringify({ check: "redis", configured: false, tested: false })); return; }
  const endpoint = !tcp ? new URL(url!) : null;
  if (endpoint) assert(endpoint.protocol === "https:" && !endpoint.username && !endpoint.password && endpoint.pathname === "/" && !endpoint.search && !endpoint.hash);
  const key = `integration:${randomUUID()}`;
  const redisKey = `naijaspa:rl:${createHash("sha256").update(key).digest("hex")}`;
  const { rateLimit } = await import("../src/lib/rate-limit");
  const { getRedisClient, closeRedisClient } = await import("../src/lib/redis");
  try {
    await rateLimit(key, 2, 30000); await rateLimit(key, 2, 30000);
    let limited = false;
    try { await rateLimit(key, 2, 30000); } catch (error) { limited = typeof error === "object" && error !== null && "status" in error && error.status === 429; }
    assert(limited);
    console.log(JSON.stringify({ check: "redis-atomic-rate-limit", transport: tcp ? "tcp" : "https", configured: true, ok: true }));
  } finally {
    // Only remove this run's randomly named test counter. Never scan shared keys.
    if (tcp) {
      try { await (await getRedisClient()).del(redisKey); } catch { /* Test counters also expire automatically. */ }
      finally { closeRedisClient(); }
    } else if (endpoint) await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(["DEL", redisKey]), signal: AbortSignal.timeout(3000) }).catch(() => {});
  }
}
main().catch(() => { console.error(JSON.stringify({ check: "redis", ok: false, detail: "Check Redis connection settings and connectivity; credentials omitted" })); process.exitCode = 1; });
