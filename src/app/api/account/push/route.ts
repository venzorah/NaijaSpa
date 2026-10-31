import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pushConfigured } from "@/lib/push";
import { PushSubscriptionSchema } from "@/lib/push-subscriptions";
import { jsonError, rateLimit } from "@/lib/http";
export async function GET() {
  try { const user = requireUser(await getSession()); const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id }, select: { endpoint: true } });
    return NextResponse.json({ configured: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || "", endpoints: subscriptions.map((s) => s.endpoint) }); }
  catch (error) { return jsonError(error); }
}
export async function POST(req: Request) {
  try { const user = requireUser(await getSession()); await rateLimit(`push-subscribe:${user.id}`, 12);
    if (!pushConfigured()) return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 });
    const body = PushSubscriptionSchema.parse(await req.json());
    await prisma.pushSubscription.upsert({ where: { endpoint: body.endpoint }, create: { userId: user.id, endpoint: body.endpoint, ...body.keys }, update: { userId: user.id, ...body.keys } });
    return NextResponse.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
export async function DELETE(req: Request) {
  try { const user = requireUser(await getSession()); const { endpoint } = z.object({ endpoint: z.string().max(4096) }).parse(await req.json());
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } }); return NextResponse.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
