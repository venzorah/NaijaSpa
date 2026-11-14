import { NextResponse } from "next/server";
import { dispatchPendingPush, queueAppointmentReminders } from "@/lib/push";
import { jsonError } from "@/lib/http";
import { jobRequestAuthorized } from "@/lib/job-auth";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    if (!jobRequestAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const queued = await queueAppointmentReminders();
    return NextResponse.json({ queued, ...await dispatchPendingPush() });
  } catch (error) { return jsonError(error); }
}
export const GET = POST;
