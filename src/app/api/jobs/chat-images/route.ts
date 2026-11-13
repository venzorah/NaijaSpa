import { NextResponse } from "next/server";
import { purgeExpiredChatImages } from "@/lib/booking-chat";
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
    await purgeExpiredChatImages();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
