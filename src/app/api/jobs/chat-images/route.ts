import { NextResponse } from "next/server";
import { purgeExpiredChatImages } from "@/lib/booking-chat";
import { jsonError } from "@/lib/http";
import { jobRequestAuthorized } from "@/lib/job-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    if (!jobRequestAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await purgeExpiredChatImages();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
