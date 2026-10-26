import { NextResponse } from "next/server";
import { processVendorPlanLifecycle } from "@/lib/subscription-lifecycle";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.INTERNAL_JOB_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return token === secret;
}

export async function GET(req: Request) {
  try {
    if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await processVendorPlanLifecycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
