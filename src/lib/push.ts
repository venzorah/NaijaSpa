import webpush from "web-push";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import { parseNotificationPreferences, safeNotificationUrl } from "./notification-preferences";
import { allowedPushEndpoint } from "./push-subscriptions";

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim() && process.env.VAPID_SUBJECT?.trim());
}
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string; tag: string }, test = false) {
  if (!pushConfigured()) return { sent: 0, failed: 0, skipped: true };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, notificationPreferencesJson: true } });
  if (!user || user.status !== "active" || (!test && !parseNotificationPreferences(user.notificationPreferencesJson).reminders)) return { sent: 0, failed: 0, skipped: true };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0, failed = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    if (!allowedPushEndpoint(subscription.endpoint)) { failed++; return; }
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({ ...payload, url: safeNotificationUrl(payload.url) }), {
          vapidDetails: { subject: process.env.VAPID_SUBJECT!.trim(), publicKey: process.env.VAPID_PUBLIC_KEY!.trim(), privateKey: process.env.VAPID_PRIVATE_KEY!.trim() },
          TTL: 3600, timeout: 10000, topic: createHash("sha256").update(payload.tag).digest("base64url").slice(0, 32)
        });
      sent++;
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if ([404, 410].includes(status)) await prisma.pushSubscription.deleteMany({ where: { id: subscription.id, userId } });
      else failed++;
    }
  }));
  return { sent, failed, skipped: subscriptions.length === 0 };
}

export async function dispatchPendingPush(limit = 4) {
  if (!pushConfigured()) return { configured: false, processed: 0 };
  const cutoff = new Date(Date.now() - 5 * 60_000);
  const rows = await prisma.notification.findMany({ where: { pushAttempts: { lt: 3 }, OR: [
    { pushStatus: "pending" }, { pushStatus: { in: ["retry", "processing"] }, pushClaimedAt: { lt: cutoff } }
  ] }, orderBy: { createdAt: "asc" }, take: Math.min(Math.max(limit, 1), 4) });
  let processed = 0;
  for (const row of rows) {
    const claimed = await prisma.notification.updateMany({ where: { id: row.id, pushStatus: row.pushStatus, pushAttempts: row.pushAttempts, pushClaimedAt: row.pushClaimedAt },
      data: { pushStatus: "processing", pushAttempts: { increment: 1 }, pushClaimedAt: new Date() } });
    if (!claimed.count) continue;
    try {
      const result = await sendPushToUser(row.userId, { title: row.title, body: "A new NaijaSpa update is available. Open the app for details.", url: row.actionUrl, tag: row.id });
      const status = result.failed ? (row.pushAttempts >= 2 ? "failed" : "retry") : result.sent ? "sent" : "skipped";
      await prisma.notification.update({ where: { id: row.id }, data: { pushStatus: status } });
    } catch {
      await prisma.notification.update({ where: { id: row.id }, data: { pushStatus: row.pushAttempts >= 2 ? "failed" : "retry" } });
    }
    processed++;
  }
  return { configured: true, processed };
}

export async function queueAppointmentReminders(now = new Date()) {
  let queued = 0;
  for (const hours of [24, 1]) {
    const bookings = await prisma.booking.findMany({ where: { status: "confirmed", startsAt: {
      gte: new Date(now.getTime() + (hours * 60 - 15) * 60_000), lt: new Date(now.getTime() + hours * 3600_000)
    } }, select: { id: true, customerId: true }, take: 100 });
    for (const booking of bookings) {
      const id = `reminder-${hours}-${booking.id}`;
      await prisma.notification.upsert({ where: { id }, create: { id, userId: booking.customerId, title: "Appointment reminder", body: "Your appointment is coming up. Open your bookings for details.", actionUrl: `/account/bookings/${booking.id}` }, update: {} });
      queued++;
    }
  }
  return queued;
}
