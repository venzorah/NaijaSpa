import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { processQueuedAnnouncements } from "@/lib/announcements";
import { jobRequestAuthorized } from "@/lib/job-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(req: Request) {
  try {
    if (!jobRequestAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await processQueuedAnnouncements());
  } catch (error) {
    return jsonError(error);
  }
}

export const POST = run;
export const GET = run;
