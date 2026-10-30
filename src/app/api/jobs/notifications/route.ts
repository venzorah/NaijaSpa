import { NextResponse } from "next/server";
import { dispatchPendingPush, queueAppointmentReminders } from "@/lib/push";
import { jsonError } from "@/lib/http";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const secrets = [process.env.CRON_SECRET?.trim(), process.env.INTERNAL_JOB_SECRET?.trim()].filter(Boolean);
    if (!token || !secrets.includes(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const queued = await queueAppointmentReminders();
    return NextResponse.json({ queued, ...await dispatchPendingPush() });
  } catch (error) { return jsonError(error); }
}
export const GET = POST;
