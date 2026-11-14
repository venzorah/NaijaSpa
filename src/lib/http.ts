import { NextResponse } from "next/server";
import { ZodError } from "zod";

function prismaCode(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) return "";
  return String((error as { code?: unknown }).code || "");
}

function publicErrorMessage(error: unknown, status: number) {
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
  const code = prismaCode(error);
  if (code === "P2002") return "That record already exists.";
  if (code.startsWith("P")) return "Could not save this change.";
  if (status >= 500) return "Something went wrong. Please try again.";
  if (typeof error === "object" && error && "status" in error && error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Request failed";
}

export function jsonError(error: unknown, fallback = 400) {
  const code = prismaCode(error);
  const status = typeof error === "object" && error && "status" in error && Number.isFinite(Number((error as { status: number }).status))
    ? Number((error as { status: number }).status)
    : code === "P2002" ? 409 : code.startsWith("P") ? 400 : fallback;
  if (status >= 500) console.error(error);
  const retryAfterMs = typeof error === "object" && error && "retryAfterMs" in error ? Number(error.retryAfterMs) : 0;
  return NextResponse.json({ error: publicErrorMessage(error, status) }, { status: Number.isFinite(status) ? status : fallback,
    ...(retryAfterMs > 0 ? { headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } } : {}) });
}

export { rateLimit, clientAddress } from "./rate-limit";
