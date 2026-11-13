import { NextResponse } from "next/server";
import { ZodError } from "zod";

function publicErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (!issue) return "Invalid input.";
    if (issue.path.includes("commissionBps") || issue.path.includes("commissionPercent")) {
      return "Commission must be a number from 0 to 100%.";
    }
    if (issue.path.includes("features")) return "Each plan feature must be 1–160 characters (up to 16 lines).";
    const field = issue.path.filter((part) => typeof part === "string").join(" ");
    return field ? `${field}: ${issue.message}` : issue.message;
  }
  return error instanceof Error ? error.message : "Request failed";
}

export function jsonError(error: unknown, fallback = 400) {
  const message = publicErrorMessage(error);
  const status = typeof error === "object" && error && "status" in error && Number.isFinite(Number((error as { status: number }).status))
    ? Number((error as { status: number }).status)
    : fallback;
  if (status >= 500) console.error(error);
  const retryAfterMs = typeof error === "object" && error && "retryAfterMs" in error ? Number(error.retryAfterMs) : 0;
  return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : fallback,
    ...(retryAfterMs > 0 ? { headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } } : {}) });
}

export { rateLimit, clientAddress } from "./rate-limit";
