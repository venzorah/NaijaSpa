import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fail: false, instances: [] as { status: string; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] }));
vi.mock("ioredis", () => ({ default: class {
  status = "wait";
  on = vi.fn();
  connect = vi.fn(async () => {
    this.status = "connecting"; await Promise.resolve();
    if (mocks.fail) { this.status = "end"; throw new Error("Redis unavailable"); }
    this.status = "ready";
  });
  disconnect = vi.fn(() => { this.status = "end"; });
  constructor() { mocks.instances.push(this); }
} }));
import { getRedisClient, closeRedisClient } from "../src/lib/redis";
beforeEach(() => { mocks.fail = false; mocks.instances.length = 0; vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379"); });
afterEach(() => { closeRedisClient(); vi.unstubAllEnvs(); });
describe("standard Redis connections", () => {
  it.each(["redis://127.0.0.1:6379", "rediss://fixture:password@redis.example.test:6380/1"])("accepts supported Redis URL %s", async (url) => {
    vi.stubEnv("REDIS_URL", url); expect((await getRedisClient()).status).toBe("ready");
  });
  it("reuses one connection and one connection attempt across concurrent callers", async () => {
    const [first, second] = await Promise.all([getRedisClient(), getRedisClient()]);
    expect(first).toBe(second); expect(mocks.instances).toHaveLength(1); expect(mocks.instances[0].connect).toHaveBeenCalledOnce();
  });
  it("can reconnect on a later request after a failed connection", async () => {
    mocks.fail = true; await expect(getRedisClient()).rejects.toThrow("unavailable");
    mocks.fail = false; expect((await getRedisClient()).status).toBe("ready"); expect(mocks.instances).toHaveLength(2);
  });
  it("closes the old connection when its configured URL changes", async () => {
    await getRedisClient(); const previous = mocks.instances[0];
    vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6380"); await getRedisClient();
    expect(previous.disconnect).toHaveBeenCalledOnce(); expect(mocks.instances).toHaveLength(2);
  });
  it("rejects non-Redis URLs before opening a connection", async () => {
    vi.stubEnv("REDIS_URL", "https://example.test"); await expect(getRedisClient()).rejects.toThrow("Invalid Redis");
    expect(mocks.instances).toHaveLength(0);
  });
});
