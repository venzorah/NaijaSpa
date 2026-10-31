import Redis from "ioredis";

type RedisState = { url: string; client: Redis; connecting?: Promise<void> };
const shared = globalThis as unknown as { naijaspaRedis?: RedisState };

export async function getRedisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("Redis connection is not configured");
  const endpoint = new URL(url);
  if (!["redis:", "rediss:"].includes(endpoint.protocol) || !endpoint.hostname || !/^\/\d*$/.test(endpoint.pathname || "/") || endpoint.search || endpoint.hash) throw new Error("Invalid Redis connection configuration");
  let state = shared.naijaspaRedis;
  if (!state || state.url !== url || state.client.status === "end") {
    state?.client.disconnect();
    const client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 3000, commandTimeout: 3000,
      maxRetriesPerRequest: 0, retryStrategy: () => null });
    // Callers receive sanitized failures. Never log credential-bearing URLs.
    client.on("error", () => {});
    state = { url, client }; shared.naijaspaRedis = state;
  }
  if (state.client.status === "wait") {
    const current = state;
    current.connecting = current.client.connect().then(() => {}).finally(() => { current.connecting = undefined; });
  }
  if (state.connecting) await state.connecting;
  if (state.client.status !== "ready") throw new Error("Redis connection is unavailable");
  return state.client;
}

export function closeRedisClient() {
  shared.naijaspaRedis?.client.disconnect();
  shared.naijaspaRedis = undefined;
}
