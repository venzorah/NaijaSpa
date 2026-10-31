BEGIN;
ALTER TABLE "PasswordReset" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
-- Legacy digests are unkeyed. Require a fresh challenge after this deployment.
UPDATE "PasswordReset" SET "usedAt" = CURRENT_TIMESTAMP WHERE "usedAt" IS NULL;
CREATE INDEX "PasswordReset_userId_createdAt_idx" ON "PasswordReset"("userId", "createdAt");
CREATE UNIQUE INDEX "PasswordReset_one_active_user" ON "PasswordReset"("userId") WHERE "usedAt" IS NULL;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_attempt_budget" CHECK ("failedAttempts" BETWEEN 0 AND 5);
COMMIT;
