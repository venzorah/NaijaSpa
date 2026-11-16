import { NextResponse } from "next/server";
import { processQueuedAnnouncements } from "@/lib/announcements";
import { purgeExpiredChatImages } from "@/lib/booking-chat";
import { jsonError } from "@/lib/http";
import { jobRequestAuthorized } from "@/lib/job-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(req: Request) {
  try {
    if (!jobRequestAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await purgeExpiredChatImages();
    const announcements = await processQueuedAnnouncements();
    return NextResponse.json({ ok: true, announcements });
  } catch (e) {
    return jsonError(e);
  }
}

export const GET = run;
export const POST = run;
