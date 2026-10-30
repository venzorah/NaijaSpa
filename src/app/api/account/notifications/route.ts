import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationPreferencesSchema, parseNotificationPreferences } from "@/lib/notification-preferences";
import { jsonError } from "@/lib/http";
export async function GET() {
  try { const user = requireUser(await getSession()); const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { notificationPreferencesJson: true } }); return NextResponse.json({ preferences: parseNotificationPreferences(row.notificationPreferencesJson) }); }
  catch (error) { return jsonError(error); }
}
export async function PUT(req: Request) {
  try { const user = requireUser(await getSession()); const preferences = NotificationPreferencesSchema.parse(await req.json());
    await prisma.user.update({ where: { id: user.id }, data: { notificationPreferencesJson: JSON.stringify(preferences) } }); return NextResponse.json({ preferences }); }
  catch (error) { return jsonError(error); }
}
