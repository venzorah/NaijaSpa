import { NextResponse } from "next/server";

export function jsonError(error: unknown, fallback = 400) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : fallback;
  if (!Number.isFinite(status) || status >= 500) console.error(error);
  const retryAfterMs = typeof error === "object" && error && "retryAfterMs" in error ? Number(error.retryAfterMs) : 0;
  return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : fallback,
    ...(retryAfterMs > 0 ? { headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } } : {}) });
}

export { rateLimit, clientAddress } from "./rate-limit";
