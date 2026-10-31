import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { getRedisClient } from "./redis";

const buckets = new Map<string, { n: number; expiresAt: number }>();
const MAX_LOCAL_BUCKETS = 10000;
const INCREMENT = `local n = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {n, ttl}`;

export function clientAddress(req: Request) {
  // Deploy behind a trusted proxy that overwrites forwarding headers.
  const address = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  return isIP(address) ? address : "unknown";
}

function unavailable() { return Object.assign(new Error("Request protection is temporarily unavailable. Please try again."), { status: 503 }); }

export async function rateLimit(key: string, max = 30, windowMs = 60_000) {
  if (!Number.isInteger(max) || max < 1 || !Number.isInteger(windowMs) || windowMs < 1) throw new Error("Invalid rate limit configuration");
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const bucketKey = `naijaspa:rl:${createHash("sha256").update(key).digest("hex")}`;
  let count: number, ttl: number;
  if (process.env.REDIS_URL?.trim()) {
    try {
      const result = await (await getRedisClient()).eval(INCREMENT, 1, bucketKey, String(windowMs));
      if (!Array.isArray(result) || result.length !== 2) throw unavailable();
      [count, ttl] = result.map(Number);
      if (!Number.isInteger(count) || count < 1 || !Number.isFinite(ttl) || ttl < 0) throw unavailable();
    } catch { throw unavailable(); }
  } else if (redisUrl || redisToken) {
    try {
      if (!redisUrl || !redisToken) throw unavailable();
      const endpoint = new URL(redisUrl);
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) throw unavailable();
      const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", INCREMENT, "1", bucketKey, String(windowMs)]), signal: AbortSignal.timeout(3000), cache: "no-store" });
      if (!response.ok) throw unavailable();
      const body = await response.json();
      if (body.error || !Array.isArray(body.result) || body.result.length !== 2) throw unavailable();
      [count, ttl] = body.result.map(Number);
      if (!Number.isInteger(count) || count < 1 || !Number.isFinite(ttl) || ttl < 0) throw unavailable();
    } catch { throw unavailable(); }
  } else {
    // Development/test convenience only. Production must share counters.
    if (process.env.NODE_ENV === "production") throw unavailable();
    const now = Date.now();
    const current = buckets.get(bucketKey);
    if (current && current.expiresAt > now) { current.n++; count = current.n; ttl = current.expiresAt - now; }
    else {
      if (buckets.size >= MAX_LOCAL_BUCKETS) for (const [id, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(id);
      if (!current && buckets.size >= MAX_LOCAL_BUCKETS) throw unavailable();
      buckets.set(bucketKey, { n: 1, expiresAt: now + windowMs }); count = 1; ttl = windowMs;
    }
  }
  if (count > max) throw Object.assign(new Error("Too many requests. Please try again later."), { status: 429, retryAfterMs: ttl });
}
