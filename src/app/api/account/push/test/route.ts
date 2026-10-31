import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { jsonError, rateLimit } from "@/lib/http";
export async function POST() {
  try { const user = requireUser(await getSession()); await rateLimit(`push-test:${user.id}`, 3);
    const result = await sendPushToUser(user.id, { title: "NaijaSpa notifications", body: "Push notifications are connected.", url: "/account/settings", tag: `test-${user.id}` }, true);
    if (!result.sent) return NextResponse.json({ error: result.skipped ? "Enable notifications on this browser first" : "The push service rejected delivery. Try enabling notifications again." }, { status: 400 });
    return NextResponse.json({ ok: true, acceptedByPushService: result.sent }); }
  catch (error) { return jsonError(error); }
}
