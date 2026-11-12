import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { processQueuedAnnouncements } from "@/lib/announcements";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const secrets = [process.env.CRON_SECRET?.trim(), process.env.INTERNAL_JOB_SECRET?.trim()].filter(Boolean);
    if (!token || !secrets.includes(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await processQueuedAnnouncements());
  } catch (error) {
    return jsonError(error);
  }
}

export const POST = run;
export const GET = run;
