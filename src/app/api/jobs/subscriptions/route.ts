import { NextResponse } from "next/server";
import { processVendorPlanLifecycle } from "@/lib/subscription-lifecycle";
import { jsonError } from "@/lib/http";
import { jobRequestAuthorized } from "@/lib/job-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    if (!jobRequestAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await processVendorPlanLifecycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
