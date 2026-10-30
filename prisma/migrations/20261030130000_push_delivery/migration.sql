ALTER TABLE "User" ADD COLUMN "notificationPreferencesJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Notification" ADD COLUMN "actionUrl" TEXT NOT NULL DEFAULT '/account/bookings';
-- Existing notifications must not trigger an unexpected historical push backlog.
ALTER TABLE "Notification" ADD COLUMN "pushStatus" TEXT NOT NULL DEFAULT 'skipped';
ALTER TABLE "Notification" ALTER COLUMN "pushStatus" SET DEFAULT 'pending';
ALTER TABLE "Notification" ADD COLUMN "pushAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Notification" ADD COLUMN "pushClaimedAt" TIMESTAMP(3);
CREATE INDEX "Notification_pushStatus_createdAt_idx" ON "Notification"("pushStatus", "createdAt");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
