ALTER TABLE "BookingMessage" ADD COLUMN IF NOT EXISTS "imageMime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookingMessage" ADD COLUMN IF NOT EXISTS "imagePayload" BYTEA;
ALTER TABLE "BookingMessage" ADD COLUMN IF NOT EXISTS "imageExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BookingMessage_imageExpiresAt_idx" ON "BookingMessage"("imageExpiresAt");
