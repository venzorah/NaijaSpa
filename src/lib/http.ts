import { NextResponse } from "next/server";

export function jsonError(error: unknown, fallback = 400) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : fallback;
  if (!Number.isFinite(status) || status >= 500) console.error(error);
  return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : fallback });
}

const buckets = new Map<string, { n: number; t: number }>();

export function rateLimit(key: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now - cur.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    return;
  }
  cur.n += 1;
  if (cur.n > max) {
    throw Object.assign(new Error("Too many requests"), { status: 429 });
  }
}
