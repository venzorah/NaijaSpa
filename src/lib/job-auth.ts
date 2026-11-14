import { timingSafeEqual } from "node:crypto";

function matchesSecret(token: string, secret: string | undefined) {
  const expected = secret?.trim();
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function jobRequestAuthorized(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  return matchesSecret(token, process.env.INTERNAL_JOB_SECRET) || matchesSecret(token, process.env.CRON_SECRET);
}
