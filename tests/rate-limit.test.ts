import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { rateLimit, clientAddress } from "../src/lib/rate-limit";
import { jsonError } from "../src/lib/http";
const redis = vi.hoisted(() => ({ eval: vi.fn(), get: vi.fn() }));
vi.mock("../src/lib/redis", () => ({ getRedisClient: redis.get }));
beforeEach(() => {
  vi.stubEnv("REDIS_URL", ""); redis.eval.mockReset(); redis.get.mockReset(); redis.get.mockResolvedValue({ eval: redis.eval });
  vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", ""); vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const configure = () => { vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fixture.upstash.io"); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fixture-token"); };
describe("shared rate protection", () => {
  it("uses standard Redis first when REDIS_URL is configured", async () => {
    configure(); vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); redis.eval.mockResolvedValue([1, 1000]);
    await rateLimit("tcp-account", 2);
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining("PEXPIRE"), 1, expect.stringMatching(/^naijaspa:rl:/), "60000");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not bypass a standard Redis failure through REST or local counters", async () => {
    configure(); vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379");
    redis.get.mockRejectedValue(new Error("Connection refused")); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(rateLimit("tcp-outage")).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("limits local development bursts and expires a bucket", async () => {
    vi.useFakeTimers(); const key = randomUUID();
    await rateLimit(key, 1, 1000);
    await expect(rateLimit(key, 1, 1000)).rejects.toMatchObject({ status: 429, retryAfterMs: 1000 });
    vi.advanceTimersByTime(1001);
    await expect(rateLimit(key, 1, 1000)).resolves.toBeUndefined();
  });
  it("uses an atomic Redis operation and keeps raw account identifiers out of keys", async () => {
    configure(); const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [1, 1000] }) }); vi.stubGlobal("fetch", fetcher);
    await rateLimit("forgot:person@example.com", 3, 1000);
    const command = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(command[0]).toBe("EVAL"); expect(command[1]).toContain("PEXPIRE");
    expect(command[3]).toMatch(/^naijaspa:rl:[a-f0-9]{64}$/); expect(command[3]).not.toContain("person@example.com");
  });
  it("shares the provider counter across independent app module instances", async () => {
    configure(); let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: [++count, 1000] }) })));
    const first = await import("../src/lib/rate-limit"); vi.resetModules(); const second = await import("../src/lib/rate-limit");
    await first.rateLimit("shared-key", 2); await second.rateLimit("shared-key", 2);
    await expect(first.rateLimit("shared-key", 2)).rejects.toMatchObject({ status: 429 });
  });
  it("blocks protected production requests when Redis is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(rateLimit(randomUUID())).rejects.toMatchObject({ status: 503 });
  });
  it("does not bypass a configured Redis outage with local counters", async () => {
    configure(); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider credential details must not leak")));
    await expect(rateLimit(randomUUID())).rejects.toMatchObject({ status: 503, message: "Request protection is temporarily unavailable. Please try again." });
  });
  it("rejects partial configuration and malformed Redis responses", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fixture.upstash.io");
    await expect(rateLimit(randomUUID())).rejects.toMatchObject({ status: 503 });
    configure(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: "unexpected" }) }));
    await expect(rateLimit(randomUUID())).rejects.toMatchObject({ status: 503 });
  });
  it("returns a Retry-After header for rejected bursts", () => {
    const result = jsonError(Object.assign(new Error("Too many requests"), { status: 429, retryAfterMs: 1500 }));
    expect(result.status).toBe(429); expect(result.headers.get("Retry-After")).toBe("2");
  });
  it("uses the first valid forwarded address and bounds invalid identifiers", () => {
    expect(clientAddress(new Request("https://app.test", { headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" } }))).toBe("203.0.113.1");
    expect(clientAddress(new Request("https://app.test", { headers: { "x-forwarded-for": "invalid" } }))).toBe("unknown");
  });
});
